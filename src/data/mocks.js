export const MOCK_KPIS = {
  suppliers: { total_suppliers: 47, active_suppliers: 31, pending_validation: 9, suspended: 7 },
  contracts: { total_contracts: 128, active_contracts: 89, expiring_soon: 11, total_spend: 4720000 },
  documents: { total_docs: 342, validated_docs: 287, processing_docs: 23, failed_docs: 32 },
  risk: { low_risk: 18, medium_risk: 21, high_risk: 6, critical_risk: 2 },
};

export const MOCK_SUPPLIERS = [
  { id: 1, name: "Acme Industrial GmbH", country: "Germany", category: "Manufacturing", status: "active", risk_score: 82, risk_level: "low", contract_count: 2 },
  { id: 2, name: "GlobalTech Solutions", country: "USA", category: "IT Services", status: "active", risk_score: 67, risk_level: "medium", contract_count: 1 },
  { id: 3, name: "FastLog Logistics Ltd", country: "UK", category: "Logistics", status: "active", risk_score: 45, risk_level: "high", contract_count: 1 },
  { id: 4, name: "Shenzhen Parts Co.", country: "China", category: "Electronics", status: "pending_validation", risk_score: 30, risk_level: "critical", contract_count: 0 },
  { id: 5, name: "EuroProcure S.A.", country: "France", category: "Procurement", status: "suspended", risk_score: 55, risk_level: "medium", contract_count: 0 },
  { id: 6, name: "Nordic Steel AB", country: "Sweden", category: "Manufacturing", status: "active", risk_score: 88, risk_level: "low", contract_count: 3 },
  { id: 7, name: "Iberian Freight S.L.", country: "Spain", category: "Logistics", status: "active", risk_score: 72, risk_level: "medium", contract_count: 1 },
  { id: 8, name: "TechBridge India Pvt.", country: "India", category: "IT Services", status: "active", risk_score: 61, risk_level: "medium", contract_count: 2 },
];

export const MOCK_CONTRACTS = [
  { id: 1, supplier_name: "Acme Industrial GmbH", title: "Framework Agreement 2024", status: "active", expiry_date: "2025-12-31", total_value: 250000, currency: "EUR" },
  { id: 2, supplier_name: "GlobalTech Solutions", title: "IT Support & Maintenance", status: "active", expiry_date: "2025-02-28", total_value: 180000, currency: "USD" },
  { id: 3, supplier_name: "FastLog Logistics Ltd", title: "Logistics SLA Agreement", status: "active", expiry_date: "2025-05-31", total_value: 95000, currency: "GBP" },
  { id: 4, supplier_name: "Acme Industrial GmbH", title: "Spare Parts Supply Contract", status: "active", expiry_date: "2024-12-31", total_value: 75000, currency: "EUR" },
  { id: 5, supplier_name: "EuroProcure S.A.", title: "Consulting Retainer 2023", status: "expired", expiry_date: "2023-12-31", total_value: 48000, currency: "EUR" },
];

export const MOCK_DOCS = [
  { id: 1, supplier_id: 1, filename: "Acme_ISO_Certificate.pdf", doc_type: "certification", status: "validated", created_at: "2024-11-10" },
  { id: 2, supplier_id: 2, filename: "GlobalTech_SOW_Q4.docx", doc_type: "contract", status: "validated", created_at: "2024-11-12" },
  { id: 3, supplier_id: 3, filename: "FastLog_Invoice_INV-082.pdf", doc_type: "invoice", status: "validation_failed", created_at: "2024-11-18" },
  { id: 4, supplier_id: 4, filename: "Shenzhen_CompReg.pdf", doc_type: "registration", status: "processing", created_at: "2024-11-20" },
  { id: 5, supplier_id: 1, filename: "Acme_Q3_FinancialReport.pdf", doc_type: "financial", status: "validated", created_at: "2024-11-05" },
];
