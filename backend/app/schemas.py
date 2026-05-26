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
    sap_id: Optional[str] = None
    dataverse_id: Optional[str] = None
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


class SapSupplierPreview(BaseModel):
    sap_id: Optional[str] = None
    name: str
    country: str
    category: str
    status: str


class SapSyncResult(BaseModel):
    total: int
    created: int
    updated: int
    skipped: int


class DataverseSupplierPreview(BaseModel):
    dataverse_id: Optional[str] = None
    name: str
    country: str
    category: str
    status: str


class DataverseSyncResult(BaseModel):
    total: int
    created: int
    updated: int
    skipped: int


class AzureSearchResult(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    supplier: Optional[str] = None
    clauseType: Optional[str] = None
    excerpt: Optional[str] = None
    relevanceScore: Optional[float] = None
    raw: Optional[dict] = None


class AzureSearchResponse(BaseModel):
    results: List[AzureSearchResult]


class PowerAutomateResponse(BaseModel):
    status: str
    raw: Optional[dict] = None


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


class ValidationIssue(BaseModel):
    entity: str
    entity_id: int
    field: str
    message: str
    severity: str = "warning"


class ValidationRunResult(BaseModel):
    total: int
    issues: List[ValidationIssue]


class OnboardingStartRequest(BaseModel):
    name: str
    country: str
    category: str
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    required_docs: Optional[List[str]] = None


class OnboardingSubmitDocRequest(BaseModel):
    doc_type: str


class OnboardingReviewRequest(BaseModel):
    decision: str
    notes: Optional[str] = None


class OnboardingOut(BaseModel):
    id: int
    supplier_id: int
    status: str
    contact_email: Optional[str] = None
    contact_name: Optional[str] = None
    required_docs: List[str] = []
    submitted_docs: List[str] = []
    notes: Optional[str] = None
    created_at: date
    updated_at: date

