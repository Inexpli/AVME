from datetime import date

from sqlalchemy.orm import Session

from . import models


def seed_if_empty(db: Session) -> None:
    if db.query(models.Supplier).count() > 0:
        return

    suppliers = [
        models.Supplier(name="Acme Industrial GmbH", country="Germany", category="Manufacturing", status="active", risk_score=82, risk_level="low"),
        models.Supplier(name="GlobalTech Solutions", country="USA", category="IT Services", status="active", risk_score=67, risk_level="medium"),
        models.Supplier(name="FastLog Logistics Ltd", country="UK", category="Logistics", status="active", risk_score=45, risk_level="high"),
        models.Supplier(name="Shenzhen Parts Co.", country="China", category="Electronics", status="pending_validation", risk_score=30, risk_level="critical"),
        models.Supplier(name="EuroProcure S.A.", country="France", category="Procurement", status="suspended", risk_score=55, risk_level="medium"),
        models.Supplier(name="Nordic Steel AB", country="Sweden", category="Manufacturing", status="active", risk_score=88, risk_level="low"),
        models.Supplier(name="Iberian Freight S.L.", country="Spain", category="Logistics", status="active", risk_score=72, risk_level="medium"),
        models.Supplier(name="TechBridge India Pvt.", country="India", category="IT Services", status="active", risk_score=61, risk_level="medium"),
    ]
    db.add_all(suppliers)
    db.flush()

    supplier_map = {s.name: s.id for s in suppliers}

    contracts = [
        models.Contract(
            supplier_id=supplier_map["Acme Industrial GmbH"],
            title="Framework Agreement 2024",
            status="active",
            expiry_date=date(2025, 12, 31),
            total_value=250000,
            currency="EUR",
        ),
        models.Contract(
            supplier_id=supplier_map["GlobalTech Solutions"],
            title="IT Support & Maintenance",
            status="active",
            expiry_date=date(2025, 2, 28),
            total_value=180000,
            currency="USD",
        ),
        models.Contract(
            supplier_id=supplier_map["FastLog Logistics Ltd"],
            title="Logistics SLA Agreement",
            status="active",
            expiry_date=date(2025, 5, 31),
            total_value=95000,
            currency="GBP",
        ),
        models.Contract(
            supplier_id=supplier_map["Acme Industrial GmbH"],
            title="Spare Parts Supply Contract",
            status="active",
            expiry_date=date(2024, 12, 31),
            total_value=75000,
            currency="EUR",
        ),
        models.Contract(
            supplier_id=supplier_map["EuroProcure S.A."],
            title="Consulting Retainer 2023",
            status="expired",
            expiry_date=date(2023, 12, 31),
            total_value=48000,
            currency="EUR",
        ),
    ]
    db.add_all(contracts)

    documents = [
        models.Document(
            supplier_id=supplier_map["Acme Industrial GmbH"],
            filename="Acme_ISO_Certificate.pdf",
            doc_type="certification",
            status="validated",
            created_at=date(2024, 11, 10),
        ),
        models.Document(
            supplier_id=supplier_map["GlobalTech Solutions"],
            filename="GlobalTech_SOW_Q4.docx",
            doc_type="contract",
            status="validated",
            created_at=date(2024, 11, 12),
        ),
        models.Document(
            supplier_id=supplier_map["FastLog Logistics Ltd"],
            filename="FastLog_Invoice_INV-082.pdf",
            doc_type="invoice",
            status="validation_failed",
            created_at=date(2024, 11, 18),
        ),
        models.Document(
            supplier_id=supplier_map["Shenzhen Parts Co."],
            filename="Shenzhen_CompReg.pdf",
            doc_type="registration",
            status="processing",
            created_at=date(2024, 11, 20),
        ),
        models.Document(
            supplier_id=supplier_map["Acme Industrial GmbH"],
            filename="Acme_Q3_FinancialReport.pdf",
            doc_type="financial",
            status="validated",
            created_at=date(2024, 11, 5),
        ),
    ]
    db.add_all(documents)

    db.commit()

