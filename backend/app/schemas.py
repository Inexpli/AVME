from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SupplierBase(BaseModel):
    name: str
    country: str
    category: str
    status: str = "active"
    risk_score: int = Field(default=50, ge=0, le=100)
    risk_level: str = "medium"


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    risk_score: Optional[int] = Field(default=None, ge=0, le=100)
    risk_level: Optional[str] = None


class SupplierOut(SupplierBase):
    id: int
    contract_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class ContractBase(BaseModel):
    supplier_id: int
    title: str
    status: str = "active"
    expiry_date: date
    total_value: float
    currency: str = "USD"


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    expiry_date: Optional[date] = None
    total_value: Optional[float] = None
    currency: Optional[str] = None


class ContractOut(ContractBase):
    id: int
    supplier_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class DocumentBase(BaseModel):
    supplier_id: int
    filename: str
    doc_type: str
    status: str = "processing"
    created_at: date


class DocumentCreate(BaseModel):
    supplier_id: int
    filename: str
    doc_type: str
    status: Optional[str] = "processing"


class DocumentUpdate(BaseModel):
    status: Optional[str] = None


class DocumentOut(DocumentBase):
    id: int
    stored_path: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class KpiSuppliers(BaseModel):
    total_suppliers: int
    active_suppliers: int
    pending_validation: int
    suspended: int


class KpiContracts(BaseModel):
    total_contracts: int
    active_contracts: int
    expiring_soon: int
    total_spend: float


class KpiDocuments(BaseModel):
    total_docs: int
    validated_docs: int
    processing_docs: int
    failed_docs: int


class KpiRisk(BaseModel):
    low_risk: int
    medium_risk: int
    high_risk: int
    critical_risk: int


class KpiResponse(BaseModel):
    suppliers: KpiSuppliers
    contracts: KpiContracts
    documents: KpiDocuments
    risk: KpiRisk


class ContractSearchRequest(BaseModel):
    query: str


class ContractSearchResult(BaseModel):
    contractTitle: str
    supplier: str
    clauseType: str
    excerpt: str
    relevanceScore: int


class ContractSearchResponse(BaseModel):
    results: List[ContractSearchResult]


class RiskAssessmentRequest(BaseModel):
    supplier_id: int


class RiskFactor(BaseModel):
    name: str
    detail: str
    impact: str


class RiskAssessmentResponse(BaseModel):
    score: int
    level: str
    factors: List[RiskFactor]
    recommendations: List[str]


class NegotiationDraftRequest(BaseModel):
    supplier_id: int
    scenario: str
    context: Optional[str] = None


class NegotiationDraftResponse(BaseModel):
    email: str


class DocumentAnalysisResponse(BaseModel):
    summary: str
    key_fields: List[str]
    issues: List[str]
    recommendation: str
    raw_text: Optional[str] = None

