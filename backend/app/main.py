import json
import mimetypes
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, Request
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from . import (
    ai,
    auth,
    azure_search,
    dataverse,
    document_processing,
    geopolitics,
    models,
    power_platform,
    sap,
    schemas,
    seed,
    storage,
    validation,
)
from .database import SessionLocal, engine

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(override=True)
UPLOADS_DIR = BASE_DIR / "uploads"

app = FastAPI(title="AVME Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if os.getenv("AAD_AUTH_ENABLED", "false").lower() != "true":
        return await call_next(request)
    path = request.url.path
    if request.method == "OPTIONS" or path in {"/", "/health", "/openapi.json"} or path.startswith("/docs") or path.startswith("/redoc"):
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return JSONResponse(status_code=401, content={"detail": "Missing bearer token."})

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return JSONResponse(status_code=401, content={"detail": "Missing bearer token."})

    try:
        await auth.verify_token(token)
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    return await call_next(request)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _provider() -> str:
    provider = os.getenv("LLM_PROVIDER")
    if provider:
        provider = provider.lower()
    else:
        if os.getenv("GROQ_API_KEY"):
            provider = "groq"
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
        else:
            provider = "mock"
    if provider not in {"mock", "anthropic", "groq"}:
        raise HTTPException(status_code=503, detail="Unsupported LLM_PROVIDER.")
    return provider


def _score_to_level(score: int) -> str:
    if score >= 80:
        return "low"
    if score >= 60:
        return "medium"
    if score >= 40:
        return "high"
    return "critical"


def _json_list(value: Optional[str]) -> List[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(v) for v in parsed]
    except json.JSONDecodeError:
        pass
    return [v.strip() for v in value.split(",") if v.strip()]


def _to_json_list(values: List[str]) -> str:
    return json.dumps(values)


def _default_required_docs() -> List[str]:
    raw = os.getenv("ONBOARDING_REQUIRED_DOCS", "registration,certification,contract")
    return [v.strip() for v in raw.split(",") if v.strip()]


def _ensure_supplier_external_columns() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        columns = conn.execute(text("PRAGMA table_info(suppliers)")).fetchall()
        names = {row[1] for row in columns}
        if "sap_id" not in names:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN sap_id VARCHAR"))
        if "dataverse_id" not in names:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN dataverse_id VARCHAR"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_suppliers_sap_id ON suppliers (sap_id)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_suppliers_dataverse_id ON suppliers (dataverse_id)"))


@app.on_event("startup")
def startup() -> None:
    models.Base.metadata.create_all(bind=engine)
    _ensure_supplier_external_columns()
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        seed.seed_if_empty(db)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/sap/health")
async def sap_health(validate: bool = False):
    if validate:
        await sap.check_connection()
    return {"status": "ok", "validate": validate}


@app.get("/azure-search/health")
async def azure_search_health(validate: bool = False):
    if validate:
        await azure_search.health_check()
    return {"status": "ok", "validate": validate}


@app.post("/azure-search/contracts", response_model=schemas.AzureSearchResponse)
async def azure_search_contracts(
    query: str = Query(..., min_length=1),
    top: int = Query(default=5, ge=1, le=50),
):
    items = await azure_search.search(query=query, top=top)
    results = []
    for item in items:
        results.append(
            schemas.AzureSearchResult(
                id=item.get("id") or item.get("Id") or item.get("docId"),
                title=item.get("title") or item.get("contractTitle"),
                supplier=item.get("supplier") or item.get("supplierName"),
                clauseType=item.get("clauseType") or item.get("clause_type"),
                excerpt=item.get("excerpt") or item.get("text") or item.get("content"),
                relevanceScore=item.get("@search.score"),
                raw=item,
            )
        )
    return schemas.AzureSearchResponse(results=results)


@app.post("/azure-search/contracts/index")
async def azure_search_index_contracts(
    db: Session = Depends(get_db),
):
    id_field = os.getenv("AZURE_SEARCH_CONTRACT_ID_FIELD", "id")
    title_field = os.getenv("AZURE_SEARCH_CONTRACT_TITLE_FIELD", "contractTitle")
    supplier_field = os.getenv("AZURE_SEARCH_CONTRACT_SUPPLIER_FIELD", "supplier")
    content_field = os.getenv("AZURE_SEARCH_CONTRACT_CONTENT_FIELD", "content")

    contracts = db.query(models.Contract).all()
    documents = []
    for contract in contracts:
        supplier_name = contract.supplier.name if contract.supplier else ""
        content = f"{contract.title} {supplier_name} {contract.status} {contract.currency} {contract.total_value}"
        documents.append(
            {
                id_field: f"contract-{contract.id}",
                title_field: contract.title,
                supplier_field: supplier_name,
                content_field: content,
                "status": contract.status,
                "expiry_date": contract.expiry_date.isoformat(),
                "total_value": contract.total_value,
                "currency": contract.currency,
            }
        )
    result = await azure_search.index_documents(documents)
    return {"status": "ok", "indexed": len(documents), "result": result}


@app.post("/sap/suppliers/pull", response_model=List[schemas.SapSupplierPreview])
async def sap_pull_suppliers(
    top: int = Query(default=50, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
):
    items = await sap.fetch_business_partners(top=top, skip=skip)
    return [schemas.SapSupplierPreview(**sap.map_bp_to_supplier(bp)) for bp in items]


@app.post("/sap/suppliers/sync", response_model=schemas.SapSyncResult)
async def sap_sync_suppliers(
    top: int = Query(default=200, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    items = await sap.fetch_business_partners(top=top, skip=skip)
    created = updated = skipped = 0
    for bp in items:
        mapped = sap.map_bp_to_supplier(bp)
        sap_id = mapped.get("sap_id")
        if not sap_id:
            skipped += 1
            continue
        supplier = db.query(models.Supplier).filter_by(sap_id=sap_id).first()
        if supplier:
            supplier.name = mapped["name"]
            supplier.country = mapped["country"]
            supplier.category = mapped["category"]
            supplier.status = mapped["status"]
            supplier.risk_score = mapped["risk_score"]
            supplier.risk_level = mapped["risk_level"]
            updated += 1
        else:
            db.add(models.Supplier(**mapped))
            created += 1
    db.commit()
    return schemas.SapSyncResult(total=len(items), created=created, updated=updated, skipped=skipped)


@app.get("/dataverse/health")
async def dataverse_health(validate: bool = False):
    if validate:
        await dataverse.check_connection()
    return {"status": "ok", "validate": validate}


@app.post("/dataverse/suppliers/pull", response_model=List[schemas.DataverseSupplierPreview])
async def dataverse_pull_suppliers(
    top: int = Query(default=50, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
):
    items = await dataverse.fetch_suppliers(top=top, skip=skip)
    return [schemas.DataverseSupplierPreview(**dataverse.map_to_supplier(item)) for item in items]


@app.post("/dataverse/suppliers/sync", response_model=schemas.DataverseSyncResult)
async def dataverse_sync_suppliers(
    top: int = Query(default=200, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    items = await dataverse.fetch_suppliers(top=top, skip=skip)
    created = updated = skipped = 0
    for item in items:
        mapped = dataverse.map_to_supplier(item)
        dataverse_id = mapped.get("dataverse_id")
        if not dataverse_id:
            skipped += 1
            continue
        supplier = db.query(models.Supplier).filter_by(dataverse_id=dataverse_id).first()
        if supplier:
            supplier.name = mapped["name"]
            supplier.country = mapped["country"]
            supplier.category = mapped["category"]
            supplier.status = mapped["status"]
            supplier.risk_score = mapped["risk_score"]
            supplier.risk_level = mapped["risk_level"]
            updated += 1
        else:
            db.add(models.Supplier(**mapped))
            created += 1
    db.commit()
    return schemas.DataverseSyncResult(total=len(items), created=created, updated=updated, skipped=skipped)


@app.get("/power-platform/health")
async def power_platform_health(validate: bool = False):
    if validate:
        await power_platform.validate_connection()
    return {"status": "ok", "validate": validate}


@app.post("/power-platform/flows/trigger", response_model=schemas.PowerAutomateResponse)
async def power_platform_trigger(payload: Dict[str, Any]):
    raw = await power_platform.trigger_flow(payload)
    return schemas.PowerAutomateResponse(status="ok", raw=raw)


@app.get("/")
def root():
    return RedirectResponse(url="/docs")


@app.get("/kpis", response_model=schemas.KpiResponse)
def get_kpis(db: Session = Depends(get_db)):
    total_suppliers = db.query(models.Supplier).count()
    active_suppliers = db.query(models.Supplier).filter_by(status="active").count()
    pending_validation = db.query(models.Supplier).filter_by(status="pending_validation").count()
    suspended = db.query(models.Supplier).filter_by(status="suspended").count()

    total_contracts = db.query(models.Contract).count()
    active_contracts = db.query(models.Contract).filter_by(status="active").count()
    expiring_cutoff = date.today() + timedelta(days=30)
    expiring_soon = (
        db.query(models.Contract)
        .filter(models.Contract.status == "active", models.Contract.expiry_date <= expiring_cutoff)
        .count()
    )
    total_spend = (
        db.query(func.coalesce(func.sum(models.Contract.total_value), 0.0))
        .filter(models.Contract.status == "active")
        .scalar()
    )

    total_docs = db.query(models.Document).count()
    validated_docs = db.query(models.Document).filter_by(status="validated").count()
    processing_docs = db.query(models.Document).filter_by(status="processing").count()
    failed_docs = db.query(models.Document).filter_by(status="validation_failed").count()

    low_risk = db.query(models.Supplier).filter_by(risk_level="low").count()
    medium_risk = db.query(models.Supplier).filter_by(risk_level="medium").count()
    high_risk = db.query(models.Supplier).filter_by(risk_level="high").count()
    critical_risk = db.query(models.Supplier).filter_by(risk_level="critical").count()

    return schemas.KpiResponse(
        suppliers=schemas.KpiSuppliers(
            total_suppliers=total_suppliers,
            active_suppliers=active_suppliers,
            pending_validation=pending_validation,
            suspended=suspended,
        ),
        contracts=schemas.KpiContracts(
            total_contracts=total_contracts,
            active_contracts=active_contracts,
            expiring_soon=expiring_soon,
            total_spend=float(total_spend or 0.0),
        ),
        documents=schemas.KpiDocuments(
            total_docs=total_docs,
            validated_docs=validated_docs,
            processing_docs=processing_docs,
            failed_docs=failed_docs,
        ),
        risk=schemas.KpiRisk(
            low_risk=low_risk,
            medium_risk=medium_risk,
            high_risk=high_risk,
            critical_risk=critical_risk,
        ),
    )


@app.get("/suppliers", response_model=List[schemas.SupplierOut])
def list_suppliers(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    risk: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Supplier)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            func.lower(models.Supplier.name).like(like)
            | func.lower(models.Supplier.country).like(like)
            | func.lower(models.Supplier.category).like(like)
        )
    if status:
        query = query.filter(models.Supplier.status == status)
    if risk:
        query = query.filter(models.Supplier.risk_level == risk)

    suppliers = query.order_by(models.Supplier.name.asc()).all()
    counts = dict(
        db.query(models.Contract.supplier_id, func.count(models.Contract.id))
        .group_by(models.Contract.supplier_id)
        .all()
    )
    return [
        schemas.SupplierOut(
            id=s.id,
            sap_id=s.sap_id,
            dataverse_id=s.dataverse_id,
            name=s.name,
            country=s.country,
            category=s.category,
            status=s.status,
            risk_score=s.risk_score,
            risk_level=s.risk_level,
            contract_count=counts.get(s.id, 0),
        )
        for s in suppliers
    ]


@app.post("/suppliers", response_model=schemas.SupplierOut, status_code=201)
def create_supplier(payload: schemas.SupplierCreate, db: Session = Depends(get_db)):
    supplier = models.Supplier(**payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return schemas.SupplierOut(
        **payload.model_dump(),
        id=supplier.id,
        sap_id=supplier.sap_id,
        dataverse_id=supplier.dataverse_id,
        contract_count=0,
    )


@app.get("/suppliers/{supplier_id}", response_model=schemas.SupplierOut)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter_by(id=supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    contract_count = db.query(models.Contract).filter_by(supplier_id=supplier_id).count()
    return schemas.SupplierOut(
        id=supplier.id,
        sap_id=supplier.sap_id,
        dataverse_id=supplier.dataverse_id,
        name=supplier.name,
        country=supplier.country,
        category=supplier.category,
        status=supplier.status,
        risk_score=supplier.risk_score,
        risk_level=supplier.risk_level,
        contract_count=contract_count,
    )


@app.patch("/suppliers/{supplier_id}", response_model=schemas.SupplierOut)
def update_supplier(supplier_id: int, payload: schemas.SupplierUpdate, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter_by(id=supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    contract_count = db.query(models.Contract).filter_by(supplier_id=supplier_id).count()
    return schemas.SupplierOut(
        id=supplier.id,
        sap_id=supplier.sap_id,
        dataverse_id=supplier.dataverse_id,
        name=supplier.name,
        country=supplier.country,
        category=supplier.category,
        status=supplier.status,
        risk_score=supplier.risk_score,
        risk_level=supplier.risk_level,
        contract_count=contract_count,
    )


def _onboarding_to_schema(record: models.SupplierOnboarding) -> schemas.OnboardingOut:
    return schemas.OnboardingOut(
        id=record.id,
        supplier_id=record.supplier_id,
        status=record.status,
        contact_email=record.contact_email,
        contact_name=record.contact_name,
        required_docs=_json_list(record.required_docs),
        submitted_docs=_json_list(record.submitted_docs),
        notes=record.notes,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@app.get("/onboarding", response_model=List[schemas.OnboardingOut])
def list_onboarding(db: Session = Depends(get_db)):
    records = db.query(models.SupplierOnboarding).order_by(models.SupplierOnboarding.created_at.desc()).all()
    return [_onboarding_to_schema(r) for r in records]


@app.post("/onboarding/start", response_model=schemas.OnboardingOut, status_code=201)
def start_onboarding(payload: schemas.OnboardingStartRequest, db: Session = Depends(get_db)):
    supplier = models.Supplier(
        name=payload.name,
        country=payload.country,
        category=payload.category,
        status="pending_validation",
        risk_score=50,
        risk_level="medium",
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)

    required_docs = payload.required_docs or _default_required_docs()
    record = models.SupplierOnboarding(
        supplier_id=supplier.id,
        status="pending_documents",
        contact_email=payload.contact_email,
        contact_name=payload.contact_name,
        required_docs=_to_json_list(required_docs),
        submitted_docs=_to_json_list([]),
        created_at=date.today(),
        updated_at=date.today(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _onboarding_to_schema(record)


@app.post("/onboarding/{onboarding_id}/submit-doc", response_model=schemas.OnboardingOut)
def submit_onboarding_doc(onboarding_id: int, payload: schemas.OnboardingSubmitDocRequest, db: Session = Depends(get_db)):
    record = db.query(models.SupplierOnboarding).filter_by(id=onboarding_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Onboarding record not found.")
    submitted = set(_json_list(record.submitted_docs))
    submitted.add(payload.doc_type)
    record.submitted_docs = _to_json_list(sorted(submitted))
    required = set(_json_list(record.required_docs))
    if required and required.issubset(submitted):
        record.status = "under_review"
    record.updated_at = date.today()
    db.commit()
    db.refresh(record)
    return _onboarding_to_schema(record)


@app.post("/onboarding/{onboarding_id}/review", response_model=schemas.OnboardingOut)
def review_onboarding(onboarding_id: int, payload: schemas.OnboardingReviewRequest, db: Session = Depends(get_db)):
    record = db.query(models.SupplierOnboarding).filter_by(id=onboarding_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Onboarding record not found.")
    supplier = db.query(models.Supplier).filter_by(id=record.supplier_id).first()
    decision = payload.decision.lower()
    if decision not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="Decision must be approve or reject.")
    record.notes = payload.notes
    record.updated_at = date.today()
    if decision == "approve":
        record.status = "approved"
        if supplier:
            supplier.status = "active"
    else:
        record.status = "rejected"
        if supplier:
            supplier.status = "suspended"
    db.commit()
    db.refresh(record)
    return _onboarding_to_schema(record)


@app.get("/contracts", response_model=List[schemas.ContractOut])
def list_contracts(
    status: Optional[str] = Query(default=None),
    supplier_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Contract)
    if status:
        query = query.filter(models.Contract.status == status)
    if supplier_id:
        query = query.filter(models.Contract.supplier_id == supplier_id)
    contracts = query.order_by(models.Contract.expiry_date.asc()).all()
    return [
        schemas.ContractOut(
            id=c.id,
            supplier_id=c.supplier_id,
            title=c.title,
            status=c.status,
            expiry_date=c.expiry_date,
            total_value=c.total_value,
            currency=c.currency,
            supplier_name=c.supplier.name if c.supplier else None,
        )
        for c in contracts
    ]


@app.post("/contracts", response_model=schemas.ContractOut, status_code=201)
def create_contract(payload: schemas.ContractCreate, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter_by(id=payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    contract = models.Contract(**payload.model_dump())
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return schemas.ContractOut(
        id=contract.id,
        supplier_id=contract.supplier_id,
        title=contract.title,
        status=contract.status,
        expiry_date=contract.expiry_date,
        total_value=contract.total_value,
        currency=contract.currency,
        supplier_name=supplier.name,
    )


@app.get("/contracts/{contract_id}", response_model=schemas.ContractOut)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).filter_by(id=contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")
    return schemas.ContractOut(
        id=contract.id,
        supplier_id=contract.supplier_id,
        title=contract.title,
        status=contract.status,
        expiry_date=contract.expiry_date,
        total_value=contract.total_value,
        currency=contract.currency,
        supplier_name=contract.supplier.name if contract.supplier else None,
    )


@app.patch("/contracts/{contract_id}", response_model=schemas.ContractOut)
def update_contract(contract_id: int, payload: schemas.ContractUpdate, db: Session = Depends(get_db)):
    contract = db.query(models.Contract).filter_by(id=contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    db.commit()
    db.refresh(contract)
    return schemas.ContractOut(
        id=contract.id,
        supplier_id=contract.supplier_id,
        title=contract.title,
        status=contract.status,
        expiry_date=contract.expiry_date,
        total_value=contract.total_value,
        currency=contract.currency,
        supplier_name=contract.supplier.name if contract.supplier else None,
    )


@app.get("/documents", response_model=List[schemas.DocumentOut])
def list_documents(
    status: Optional[str] = Query(default=None),
    supplier_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Document)
    if status:
        query = query.filter(models.Document.status == status)
    if supplier_id:
        query = query.filter(models.Document.supplier_id == supplier_id)
    docs = query.order_by(models.Document.created_at.desc()).all()
    return [
        schemas.DocumentOut(
            id=d.id,
            supplier_id=d.supplier_id,
            filename=d.filename,
            doc_type=d.doc_type,
            status=d.status,
            created_at=d.created_at,
            stored_path=d.stored_path,
        )
        for d in docs
    ]


@app.post("/documents", response_model=schemas.DocumentOut, status_code=201)
def create_document(payload: schemas.DocumentCreate, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter_by(id=payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    doc = models.Document(
        supplier_id=payload.supplier_id,
        filename=payload.filename,
        doc_type=payload.doc_type,
        status=payload.status or "processing",
        created_at=date.today(),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return schemas.DocumentOut(
        id=doc.id,
        supplier_id=doc.supplier_id,
        filename=doc.filename,
        doc_type=doc.doc_type,
        status=doc.status,
        created_at=doc.created_at,
        stored_path=doc.stored_path,
    )


@app.post("/documents/upload", response_model=schemas.DocumentOut, status_code=201)
async def upload_document(
    supplier_id: int = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    supplier = db.query(models.Supplier).filter_by(id=supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    safe_name = f"{int(datetime.utcnow().timestamp())}_{file.filename}"
    content = await file.read()
    stored_path = await storage.save_file(safe_name, content, file.content_type)
    doc = models.Document(
        supplier_id=supplier_id,
        filename=file.filename,
        doc_type=doc_type,
        status="processing",
        created_at=date.today(),
        stored_path=str(stored_path),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return schemas.DocumentOut(
        id=doc.id,
        supplier_id=doc.supplier_id,
        filename=doc.filename,
        doc_type=doc.doc_type,
        status=doc.status,
        created_at=doc.created_at,
        stored_path=doc.stored_path,
    )


@app.post("/documents/{doc_id}/validate", response_model=schemas.DocumentAnalysisResponse)
async def validate_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter_by(id=doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if not doc.stored_path:
        raise HTTPException(status_code=400, detail="Document has no stored file.")

    content_type = mimetypes.guess_type(doc.filename)[0] or "application/octet-stream"
    file_bytes = await storage.read_file(doc.stored_path)
    text = await document_processing.extract_text(file_bytes, content_type)
    if not text.strip():
        doc.status = "validation_failed"
        db.commit()
        return schemas.DocumentAnalysisResponse(
            summary="No readable text extracted from document.",
            key_fields=[],
            issues=["No text extracted. Verify document quality and format."],
            recommendation="Re-upload a clearer document or verify the file format.",
            raw_text="",
        )
    entities, key_phrases = await document_processing.extract_entities(text)

    key_fields = document_processing.build_key_fields(entities)
    issues: List[str] = []

    supplier = doc.supplier
    if supplier:
        contract_titles = [c.title for c in supplier.contracts]
        issues.extend(document_processing.cross_reference(text, supplier.name, contract_titles))

    issues.extend(document_processing.compliance_checks(doc.doc_type, text, entities, key_phrases))
    summary = document_processing.summarize(text, key_phrases)
    recommendation = "Proceed with validation and archive." if not issues else "Review flagged issues before approval."

    doc.status = "validated" if not issues else "validation_failed"
    db.commit()

    return schemas.DocumentAnalysisResponse(
        summary=summary,
        key_fields=key_fields,
        issues=issues,
        recommendation=recommendation,
        raw_text=document_processing.trim_text(text),
    )


@app.post("/validation/run", response_model=schemas.ValidationRunResult)
def run_validation(apply: bool = Query(default=False), db: Session = Depends(get_db)):
    issues: List[schemas.ValidationIssue] = []
    suppliers = db.query(models.Supplier).all()
    contracts = db.query(models.Contract).all()
    documents = db.query(models.Document).all()

    for supplier in suppliers:
        supplier_issues = validation.validate_supplier(supplier)
        issues.extend(supplier_issues)
        if apply and supplier_issues:
            supplier.status = "pending_validation"

    for contract in contracts:
        contract_issues = validation.validate_contract(contract)
        issues.extend(contract_issues)
        if apply and contract_issues:
            contract.status = "draft"

    for doc in documents:
        doc_issues = validation.validate_document(doc)
        issues.extend(doc_issues)
        if apply and doc_issues:
            doc.status = "validation_failed"

    if apply:
        db.commit()

    return schemas.ValidationRunResult(total=len(issues), issues=issues)


@app.post("/risk/assess", response_model=schemas.RiskAssessmentResponse)
async def assess_risk(payload: schemas.RiskAssessmentRequest, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter_by(id=payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    provider = _provider()
    geo = await geopolitics.score(supplier.country)
    geo_factor = {
        "name": "Geopolitical exposure",
        "detail": geo.get("detail") or f"Country risk baseline for {supplier.country}.",
        "impact": geo.get("level", "medium"),
    }

    if provider == "mock":
        base = ai.mock_risk_assessment(supplier)
        score = round((base.score + int(geo.get("score", 60))) / 2)
        level = _score_to_level(score)
        factors = [*base.factors, schemas.RiskFactor(**geo_factor)]
        return schemas.RiskAssessmentResponse(
            score=score,
            level=level,
            factors=factors,
            recommendations=base.recommendations,
        )

    try:
        if provider == "anthropic":
            text = await ai.call_anthropic(
                system=(
                    "Return ONLY JSON with fields: score (0-100), level (low|medium|high|critical), "
                    "factors [{name, detail, impact}], recommendations [string]."
                ),
                user_content=(
                    f"Supplier: {supplier.name}\nCountry: {supplier.country}\nCategory: {supplier.category}\n"
                    f"Status: {supplier.status}\nRisk score: {supplier.risk_score}\n"
                    f"Active contracts: {len(supplier.contracts)}"
                ),
                max_tokens=800,
            )
        else:
            text = await ai.call_groq(
                system=(
                    "Return ONLY JSON with fields: score (0-100), level (low|medium|high|critical), "
                    "factors [{name, detail, impact}], recommendations [string]."
                ),
                user_content=(
                    f"Supplier: {supplier.name}\nCountry: {supplier.country}\nCategory: {supplier.category}\n"
                    f"Status: {supplier.status}\nRisk score: {supplier.risk_score}\n"
                    f"Active contracts: {len(supplier.contracts)}"
                ),
                max_tokens=800,
                temperature=0.2,
            )
        payload_data = ai.parse_json_payload(text)
        base_score = int(payload_data.get("score", supplier.risk_score))
        score = round((base_score + int(geo.get("score", 60))) / 2)
        level = payload_data.get("level") or _score_to_level(score)
        factors = [schemas.RiskFactor(**f) for f in payload_data.get("factors", [])]
        factors.append(schemas.RiskFactor(**geo_factor))
        recommendations = payload_data.get("recommendations", [])
        return schemas.RiskAssessmentResponse(score=score, level=level, factors=factors, recommendations=recommendations)
    except ai.LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        base_score = supplier.risk_score
        score = round((base_score + int(geo.get("score", 60))) / 2)
        level = _score_to_level(score)
        factors = [
            schemas.RiskFactor(
                name="Financial stability",
                detail=f"Baseline score from supplier profile ({supplier.risk_score}).",
                impact="medium",
            ),
            schemas.RiskFactor(
                name="Compliance posture",
                detail=f"Supplier status is '{supplier.status}'.",
                impact="high" if supplier.status != "active" else "low",
            ),
            schemas.RiskFactor(**geo_factor),
        ]
        recommendations = [
            "AI model unavailable; used baseline scoring.",
            "Schedule quarterly compliance reviews and refresh certifications.",
            "Maintain dual-source coverage for critical SKUs.",
        ]
        return schemas.RiskAssessmentResponse(score=score, level=level, factors=factors, recommendations=recommendations)


@app.post("/negotiation/draft", response_model=schemas.NegotiationDraftResponse)
async def draft_email(payload: schemas.NegotiationDraftRequest, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter_by(id=payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    provider = _provider()
    if provider == "mock":
        email = ai.mock_negotiation_email(supplier, payload.scenario, payload.context or "")
        return schemas.NegotiationDraftResponse(email=email)

    try:
        if provider == "anthropic":
            text = await ai.call_anthropic(
                system="Draft a professional procurement negotiation email. Include a subject line.",
                user_content=(
                    f"Supplier: {supplier.name} ({supplier.country})\n"
                    f"Scenario: {payload.scenario}\n"
                    f"Context: {payload.context or 'Standard negotiation context.'}\n"
                    f"Risk level: {supplier.risk_level}\n"
                    f"Category: {supplier.category}"
                ),
                max_tokens=800,
            )
        else:
            text = await ai.call_groq(
                system="Draft a professional procurement negotiation email. Include a subject line.",
                user_content=(
                    f"Supplier: {supplier.name} ({supplier.country})\n"
                    f"Scenario: {payload.scenario}\n"
                    f"Context: {payload.context or 'Standard negotiation context.'}\n"
                    f"Risk level: {supplier.risk_level}\n"
                    f"Category: {supplier.category}"
                ),
                max_tokens=800,
            )
        return schemas.NegotiationDraftResponse(email=text)
    except ai.LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI email drafting failed.") from exc


@app.post("/negotiation/stream")
async def stream_email(payload: schemas.NegotiationDraftRequest, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter_by(id=payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    provider = _provider()
    if provider == "mock":
        email = ai.mock_negotiation_email(supplier, payload.scenario, payload.context or "")
        return StreamingResponse(iter([email]), media_type="text/plain")

    try:
        def _gen():
            for chunk in ai.stream_groq(
                system="Draft a professional procurement negotiation email. Include a subject line.",
                user_content=(
                    f"Supplier: {supplier.name} ({supplier.country})\n"
                    f"Scenario: {payload.scenario}\n"
                    f"Context: {payload.context or 'Standard negotiation context.'}\n"
                    f"Risk level: {supplier.risk_level}\n"
                    f"Category: {supplier.category}"
                ),
                max_tokens=900,
                temperature=0.7,
            ):
                yield chunk

        return StreamingResponse(_gen(), media_type="text/plain")
    except ai.LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI streaming draft failed.") from exc


@app.post("/contracts/search", response_model=schemas.ContractSearchResponse)
async def search_contracts(payload: schemas.ContractSearchRequest, db: Session = Depends(get_db)):
    contracts = db.query(models.Contract).all()
    provider = _provider()
    if provider == "mock":
        return ai.mock_contract_search(contracts, payload.query)

    try:
        if provider == "anthropic":
            text = await ai.call_anthropic(
                system=(
                    "Return ONLY JSON array of 3 results: "
                    "{contractTitle, supplier, clauseType, excerpt, relevanceScore}."
                ),
                user_content=f"Search query: {payload.query}",
                max_tokens=700,
            )
        else:
            text = await ai.call_groq(
                system=(
                    "Return ONLY JSON array of 3 results: "
                    "{contractTitle, supplier, clauseType, excerpt, relevanceScore}."
                ),
                user_content=f"Search query: {payload.query}",
                max_tokens=700,
            )
        payload = ai.parse_json_payload(text)
        results = [schemas.ContractSearchResult(**item) for item in payload]
        return schemas.ContractSearchResponse(results=results)
    except ai.LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI contract search failed.") from exc

