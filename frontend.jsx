import { useState, useEffect, useRef, useCallback } from "react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { loginRequest, msalInstance } from "./src/authConfig.js";

const MOCK_KPIS = {
  suppliers: { total_suppliers: 47, active_suppliers: 31, pending_validation: 9, suspended: 7 },
  contracts: { total_contracts: 128, active_contracts: 89, expiring_soon: 11, total_spend: 4720000 },
  documents: { total_docs: 342, validated_docs: 287, processing_docs: 23, failed_docs: 32 },
  risk: { low_risk: 18, medium_risk: 21, high_risk: 6, critical_risk: 2 },
};

const MOCK_SUPPLIERS = [
  { id: 1, name: "Acme Industrial GmbH",  country: "Germany", category: "Manufacturing", status: "active",             risk_score: 82, risk_level: "low",      contract_count: 2 },
  { id: 2, name: "GlobalTech Solutions",   country: "USA",     category: "IT Services",  status: "active",             risk_score: 67, risk_level: "medium",   contract_count: 1 },
  { id: 3, name: "FastLog Logistics Ltd",  country: "UK",      category: "Logistics",    status: "active",             risk_score: 45, risk_level: "high",     contract_count: 1 },
  { id: 4, name: "Shenzhen Parts Co.",     country: "China",   category: "Electronics",  status: "pending_validation", risk_score: 30, risk_level: "critical", contract_count: 0 },
  { id: 5, name: "EuroProcure S.A.",       country: "France",  category: "Procurement",  status: "suspended",          risk_score: 55, risk_level: "medium",   contract_count: 0 },
  { id: 6, name: "Nordic Steel AB",        country: "Sweden",  category: "Manufacturing",status: "active",             risk_score: 88, risk_level: "low",      contract_count: 3 },
  { id: 7, name: "Iberian Freight S.L.",   country: "Spain",   category: "Logistics",    status: "active",             risk_score: 72, risk_level: "medium",   contract_count: 1 },
  { id: 8, name: "TechBridge India Pvt.", country: "India",   category: "IT Services",  status: "active",             risk_score: 61, risk_level: "medium",   contract_count: 2 },
];

const MOCK_CONTRACTS = [
  { id: 1, supplier_name: "Acme Industrial GmbH",  title: "Framework Agreement 2024",   status: "active",  expiry_date: "2025-12-31", total_value: 250000, currency: "EUR" },
  { id: 2, supplier_name: "GlobalTech Solutions",   title: "IT Support & Maintenance",   status: "active",  expiry_date: "2025-02-28", total_value: 180000, currency: "USD" },
  { id: 3, supplier_name: "FastLog Logistics Ltd",  title: "Logistics SLA Agreement",    status: "active",  expiry_date: "2025-05-31", total_value: 95000,  currency: "GBP" },
  { id: 4, supplier_name: "Acme Industrial GmbH",  title: "Spare Parts Supply Contract", status: "active",  expiry_date: "2024-12-31", total_value: 75000,  currency: "EUR" },
  { id: 5, supplier_name: "EuroProcure S.A.",       title: "Consulting Retainer 2023",   status: "expired", expiry_date: "2023-12-31", total_value: 48000,  currency: "EUR" },
];

const MOCK_DOCS = [
  { id: 1, supplier_id: 1, filename: "Acme_ISO_Certificate.pdf",     doc_type: "certification", status: "validated",        created_at: "2024-11-10" },
  { id: 2, supplier_id: 2, filename: "GlobalTech_SOW_Q4.docx",       doc_type: "contract",      status: "validated",        created_at: "2024-11-12" },
  { id: 3, supplier_id: 3, filename: "FastLog_Invoice_INV-082.pdf",  doc_type: "invoice",       status: "validation_failed",created_at: "2024-11-18" },
  { id: 4, supplier_id: 4, filename: "Shenzhen_CompReg.pdf",         doc_type: "registration",  status: "processing",       created_at: "2024-11-20" },
  { id: 5, supplier_id: 1, filename: "Acme_Q3_FinancialReport.pdf",  doc_type: "financial",     status: "validated",        created_at: "2024-11-05" },
];

const PROJECT_META = {
  title: "Autonomous Vendor Management Ecosystem",
  summary: "Enterprise-grade AI ecosystem optimizing procurement from supplier onboarding through contract fulfillment. The platform automates document validation, negotiation workflows, and risk assessment to streamline global operations with high data accuracy and strategic supplier alignment.",
  role: "Software Developer / AI Specialist",
  period: "11.2024 - Till Now",
};

const PROJECT_STATS = [
  { label: "Manual error reduction", value: "35%", accent: "#1D9E75" },
  { label: "Man-hours saved / month", value: "400 h", accent: "#185FA5" },
  { label: "Contracts indexed", value: "10K+", accent: "#0F6E56" },
  { label: "Automation accuracy", value: "95%", accent: "#BA7517" },
];

const PROJECT_RESPONSIBILITIES = [
  "Facilitated technical discovery sessions with procurement leads to define the roadmap for an AI-enhanced supplier management platform.",
  "Architected a scalable backend structure utilizing Python and SQL to manage a centralized repository of supplier contracts.",
  "Embraced 'vibe coding' workflows and utilized Antigravity to orchestrate complex state logic between the React frontend and autonomous backend agents without rigid boilerplate.",
  "Pushed experimental builds to operations teams rapidly using Replit, embracing a fast build-test-discard prototyping loop.",
  "Engineered Autonomous Agents to automatically extract, cross-reference, and validate data from incoming supplier documentation.",
  "Rapidly scaffolded Python-based compliance analysis scripts using Claude Code to evaluate vendor performance metrics.",
  "Engineered lightweight Node.js microservices to securely proxy high-volume API requests between internal logistics databases and external LLM endpoints.",
  "Deployed OpenAI LLMs to assist procurement officers in drafting negotiation emails and summarizing risk factors instantly.",
  "Utilized Bolt and v0 to generate responsive dashboard components in React, accelerating the frontend development cycle significantly.",
  "Integrated Azure AI Search to enable procurement officers to retrieve relevant contract clauses across 10,000+ historical documents.",
  "Achieved a 35% reduction in manual data entry errors by implementing AI-based validation loops and refined prompt engineering.",
  "Used Cursor IDE as the primary IDE to rapidly refactor and design custom connectors for synchronizing procurement data with SAP ERP modules.",
  "Developed a Model Driven App in Power Apps to provide operations managers with a unified view of the entire supplier lifecycle and spend trends.",
  "Saved 400 man-hours per month by replacing manual contract review processes with automated LLM-powered summarization logic.",
];

const PROJECT_ENVIRONMENT = [
  "Dataverse", "Python", "Node.js", "SQL", "MySQL", "SAP", "JavaScript", "React", "HTML", "CSS",
  "Azure AI Search", "Microsoft Entra ID", "Power Apps", "Power Automate", "Model Driven App",
  "Antigravity", "Claude Code", "Cursor IDE", "Replit", "v0", "Bolt", "OpenAI LLMs",
  "Autonomous Agents", "Prompt Engineering", "Git", "Azure DevOps", "GitHub",
];

const PROJECT_CAPABILITIES = [
  { icon: "🧭", title: "Supplier Onboarding", desc: "Automated validation pipelines for new vendors with real-time compliance checks." },
  { icon: "📄", title: "Contract Intelligence", desc: "Semantic search over 10,000+ clauses using Azure AI Search indexing." },
  { icon: "🧾", title: "Document Processing", desc: "AI extraction and cross-referencing across certifications, invoices, and contracts." },
  { icon: "🛡", title: "Risk Assessment", desc: "Autonomous agent scoring across compliance, financial, and geopolitical factors." },
  { icon: "✉️", title: "Negotiation Assistant", desc: "LLM-drafted negotiation emails with strategic, relationship-safe language." },
  { icon: "🔗", title: "Enterprise Integrations", desc: "SAP, Dataverse, and Node.js microservices to unify procurement operations." },
];

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const AUTH_ENABLED = (import.meta.env.VITE_AAD_ENABLED ?? "true").toLowerCase() === "true";

async function getAccessToken() {
  if (!AUTH_ENABLED) return null;
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) return null;
  if (!loginRequest.scopes || loginRequest.scopes.length === 0) {
    throw new Error("Azure AD scope is not configured.");
  }
  try {
    const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const result = await msalInstance.acquireTokenPopup({ ...loginRequest, account });
      return result.accessToken;
    }
    throw err;
  }
}

async function apiFetch(path, options = {}) {
  const token = await getAccessToken();
  const hasBody = options.body && !(options.body instanceof FormData);
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const headers = hasBody
    ? { "Content-Type": "application/json", ...authHeader, ...options.headers }
    : { ...authHeader, ...options.headers };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.detail ? String(data.detail) : JSON.stringify(data);
    } catch (err) {
      detail = await res.text();
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiStream(path, options = {}) {
  const token = await getAccessToken();
  const hasBody = options.body && !(options.body instanceof FormData);
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const headers = hasBody
    ? { "Content-Type": "application/json", ...authHeader, ...options.headers }
    : { ...authHeader, ...options.headers };
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const riskColor = (l) => ({ low: "#1D9E75", medium: "#BA7517", high: "#D85A30", critical: "#E24B4A" }[l] || "#888");
const statusColor = (s) => ({
  active: "#1D9E75", pending_validation: "#BA7517", suspended: "#D85A30", blacklisted: "#E24B4A",
  validated: "#1D9E75", processing: "#185FA5", validation_failed: "#E24B4A", error: "#E24B4A",
  draft: "#888780", expired: "#888780", terminated: "#E24B4A",
}[s] || "#888");
const statusBg = (s) => ({
  active: "#E1F5EE", pending_validation: "#FAEEDA", suspended: "#FAECE7", blacklisted: "#FCEBEB",
  validated: "#E1F5EE", processing: "#E6F1FB", validation_failed: "#FCEBEB", error: "#FCEBEB",
  draft: "#F1EFE8", expired: "#F1EFE8", terminated: "#FCEBEB",
  low: "#E1F5EE", medium: "#FAEEDA", high: "#FAECE7", critical: "#FCEBEB",
}[s] || "#F1EFE8");
const fmt = (n, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

// ─── Shared UI components ─────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      background: bg, color, whiteSpace: "nowrap",
    }}>
      {String(label).replace(/_/g, " ")}
    </span>
  );
}

function Bar({ value, max, color }) {
  return (
    <div style={{ background: "#ECEAE3", borderRadius: 4, height: 5, overflow: "hidden" }}>
      <div style={{ width: `${pct(value, max)}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function KpiCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{
      background: "#fff", border: "0.5px solid #E5E3DC", borderRadius: 10,
      padding: "18px 20px", minWidth: 0, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent, borderRadius: "10px 10px 0 0" }} />
      {icon && <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>}
      <div style={{ fontSize: 11, color: "#888780", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#2C2C2A", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#888780", marginTop: 8, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

function Spinner({ size = 18, color = "#185FA5" }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}22`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.75s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#2C2C2A", letterSpacing: "-0.02em" }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: "#888780", margin: "5px 0 0", lineHeight: 1.4 }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #E5E3DC", borderRadius: 10, ...style }}>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#5F5E5A", marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "#B4B2A9" }}>{sub}</div>}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: "#FCEBEB",
      border: "0.5px solid #F4B7B7",
      color: "#A62929",
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 12,
      marginBottom: 16,
    }}>
      {message}
    </div>
  );
}

function Btn({ onClick, disabled, children, variant = "primary", style: s = {} }) {
  const base = {
    border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13,
    fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", gap: 7, transition: "opacity 0.15s",
    opacity: disabled ? 0.65 : 1, ...s,
  };
  const variants = {
    primary: { background: "#185FA5", color: "#fff" },
    secondary: { background: "#F1EFE8", color: "#444441", border: "0.5px solid #D3D1C7" },
    ghost: { background: "transparent", color: "#5F5E5A", border: "0.5px solid #D3D1C7" },
    success: { background: "#1D9E75", color: "#fff" },
    danger: { background: "#E24B4A", color: "#fff" },
  };
  return <button onClick={!disabled ? onClick : undefined} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

// ─── PROJECT OVERVIEW ─────────────────────────────────────────────────────────
function ProjectOverview() {
  return (
    <div>
      <SectionHeader title="Project Overview" sub="Autonomous Vendor Management Ecosystem (AVME)" />

      <Card style={{ padding: 24, marginBottom: 18, background: "linear-gradient(135deg, #0E2E4B 0%, #0C1E2F 100%)", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Enterprise Procurement Platform</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{PROJECT_META.title}</h1>
            <p style={{ margin: "10px 0 16px", color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.65 }}>{PROJECT_META.summary}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge label={PROJECT_META.role} color="#85B7EB" bg="rgba(133,183,235,0.18)" />
              <Badge label={PROJECT_META.period} color="#BEE6D9" bg="rgba(29,158,117,0.16)" />
            </div>
          </div>
          <div style={{ flex: "1 1 260px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {PROJECT_STATS.map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 16px", border: "0.5px solid rgba(255,255,255,0.14)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.accent, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, marginBottom: 18 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: "#2C2C2A", letterSpacing: "-0.01em" }}>Responsibilities</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {PROJECT_RESPONSIBILITIES.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#185FA5", marginTop: 7, flexShrink: 0 }} />
                <div style={{ fontSize: 13, color: "#444441", lineHeight: 1.6 }}>{item}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: "#2C2C2A", letterSpacing: "-0.01em" }}>Environment</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PROJECT_ENVIRONMENT.map(t => (
              <Badge key={t} label={t} color="#444441" bg="#F1EFE8" />
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {PROJECT_CAPABILITIES.map(c => (
          <Card key={c.title} style={{ padding: 16 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2C2C2A", marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.55 }}>{c.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard() {
  const [kpis, setKpis] = useState(MOCK_KPIS);
  const [contracts, setContracts] = useState(MOCK_CONTRACTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([apiFetch("/kpis"), apiFetch("/contracts?status=active")])
      .then(([kpiData, contractData]) => {
        if (!active) return;
        setKpis(kpiData);
        setContracts(contractData);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const k = kpis;

  return (
    <div>
      <SectionHeader title="Overview" sub={`Live procurement intelligence · ${today}`} />
      <ErrorBanner message={error} />
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#185FA5", fontSize: 13, marginBottom: 14 }}>
          <Spinner size={14} /> Loading live metrics…
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard icon="🏢" label="Total Suppliers"  value={k.suppliers.total_suppliers}  sub={`${k.suppliers.active_suppliers} active · ${k.suppliers.pending_validation} pending`} accent="#185FA5" />
        <KpiCard icon="📄" label="Active Contracts" value={k.contracts.active_contracts} sub={`${k.contracts.expiring_soon} expiring ≤30 days`}     accent="#0F6E56" />
        <KpiCard icon="💰" label="Total Spend"      value={fmt(k.contracts.total_spend)}  sub="across all active contracts"                           accent="#2C2C2A" />
        <KpiCard icon="✅" label="Docs Validated"   value={`${pct(k.documents.validated_docs, k.documents.total_docs)}%`} sub={`${k.documents.failed_docs} failed · ${k.documents.processing_docs} processing`} accent="#BA7517" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 18, color: "#2C2C2A", letterSpacing: "-0.01em" }}>Supplier Pipeline</div>
          {[
            { label: "Active",             val: k.suppliers.active_suppliers,   color: "#1D9E75" },
            { label: "Pending Validation", val: k.suppliers.pending_validation, color: "#BA7517" },
            { label: "Suspended",          val: k.suppliers.suspended,          color: "#D85A30" },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "#5F5E5A" }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color, fontFamily: "'DM Mono', monospace" }}>{r.val}</span>
              </div>
              <Bar value={r.val} max={k.suppliers.total_suppliers} color={r.color} />
            </div>
          ))}
        </Card>

        <Card style={{ padding: "20px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 18, color: "#2C2C2A", letterSpacing: "-0.01em" }}>Risk Distribution</div>
          {[
            { label: "Low Risk",    val: k.risk.low_risk,      color: "#1D9E75" },
            { label: "Medium Risk", val: k.risk.medium_risk,   color: "#BA7517" },
            { label: "High Risk",   val: k.risk.high_risk,     color: "#D85A30" },
            { label: "Critical",    val: k.risk.critical_risk, color: "#E24B4A" },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ color: "#5F5E5A" }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color, fontFamily: "'DM Mono', monospace" }}>{r.val}</span>
              </div>
              <Bar value={r.val} max={k.suppliers.active_suppliers} color={r.color} />
            </div>
          ))}
        </Card>
      </div>

      {/* Recent contracts expiring */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #F1EFE8", fontWeight: 700, fontSize: 13, color: "#2C2C2A" }}>
          ⚠️ Contracts Expiring Soon
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {contracts.filter(c => {
              const soon = new Date(c.expiry_date) < new Date(Date.now() + 90 * 86400000);
              return soon && c.status === "active";
            }).map((c, i, arr) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8" }}>
                <td style={{ padding: "11px 20px", fontWeight: 500, color: "#2C2C2A", borderBottom: i < arr.length - 1 ? "0.5px solid #F1EFE8" : "none" }}>{c.title}</td>
                <td style={{ padding: "11px 20px", color: "#5F5E5A", borderBottom: i < arr.length - 1 ? "0.5px solid #F1EFE8" : "none" }}>{c.supplier_name}</td>
                <td style={{ padding: "11px 20px", borderBottom: i < arr.length - 1 ? "0.5px solid #F1EFE8" : "none", color: "#D85A30", fontWeight: 600 }}>{c.expiry_date}</td>
                <td style={{ padding: "11px 20px", fontFamily: "'DM Mono', monospace", color: "#2C2C2A", borderBottom: i < arr.length - 1 ? "0.5px solid #F1EFE8" : "none" }}>{fmt(c.total_value, c.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Impact banner */}
      <div style={{
        background: "linear-gradient(135deg, #0F6E56 0%, #085041 100%)",
        borderRadius: 10, padding: "20px 28px",
        display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap",
      }}>
        {[
          { label: "Man-hours saved / month", value: "400 h" },
          { label: "Data entry error reduction", value: "35%" },
          { label: "Automation accuracy", value: "95%" },
          { label: "Contracts indexed", value: "10K+" },
        ].map((item, i, arr) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", flex: "1 1 150px" }}>
            <div style={{ padding: "0 24px 0 0" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{item.value}</div>
            </div>
            {i < arr.length - 1 && <div style={{ width: 1, background: "rgba(255,255,255,0.18)", alignSelf: "stretch", marginRight: 24 }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
function Suppliers() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", category: "", contactName: "", contactEmail: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/suppliers");
      setSuppliers(data);
    } catch (err) {
      setError(err.message || "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const list = suppliers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    const matchFilter = filter === "all" || s.status === filter || s.risk_level === filter;
    return matchSearch && matchFilter;
  });

  const handleSave = async () => {
    if (!form.name || !form.country || !form.category) {
      setError("Company name, country, and category are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await apiFetch("/suppliers", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          country: form.country,
          category: form.category,
          status: "pending_validation",
          risk_score: 50,
          risk_level: "medium",
        }),
      });
      setSuppliers(prev => [created, ...prev]);
      setSaved(true);
      setTimeout(() => {
        setShowForm(false);
        setSaved(false);
        setForm({ name: "", country: "", category: "", contactName: "", contactEmail: "" });
      }, 1400);
    } catch (err) {
      setError(err.message || "Failed to onboard supplier.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionHeader title="Suppliers" sub={`${suppliers.length} vendors in registry`} />
        <Btn onClick={() => setShowForm(true)}>+ Onboard Supplier</Btn>
      </div>
      <ErrorBanner message={error} />
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#185FA5", fontSize: 13, marginBottom: 12 }}>
          <Spinner size={14} /> Loading suppliers…
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, country, category…"
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, border: "0.5px solid #D3D1C7", fontSize: 13, outline: "none", background: "#fff" }}
        />
        {["all", "active", "pending_validation", "suspended", "high", "critical"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: "0.5px solid", cursor: "pointer", transition: "all 0.15s",
            borderColor: filter === f ? "#185FA5" : "#D3D1C7",
            background: filter === f ? "#E6F1FB" : "#fff",
            color: filter === f ? "#185FA5" : "#5F5E5A",
          }}>
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F9F8F5" }}>
              {["Supplier", "Country", "Category", "Status", "Risk Score", "Contracts"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#5F5E5A", borderBottom: "0.5px solid #E5E3DC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && list.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#B4B2A9", fontSize: 13 }}>No suppliers match your filter</td></tr>
            )}
            {list.map((s, i) => (
              <tr key={s.id}
                onClick={() => setSelected(selected?.id === s.id ? null : s)}
                style={{ cursor: "pointer", background: selected?.id === s.id ? "#F0F5FB" : i % 2 === 0 ? "#fff" : "#FAFAF8", transition: "background 0.1s" }}
                onMouseEnter={e => { if (selected?.id !== s.id) e.currentTarget.style.background = "#F5F5F2"; }}
                onMouseLeave={e => { if (selected?.id !== s.id) e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFAF8"; }}>
                <td style={{ padding: "12px 16px", fontWeight: 600, color: "#2C2C2A", borderBottom: "0.5px solid #F1EFE8" }}>{s.name}</td>
                <td style={{ padding: "12px 16px", color: "#5F5E5A", borderBottom: "0.5px solid #F1EFE8" }}>{s.country}</td>
                <td style={{ padding: "12px 16px", color: "#5F5E5A", borderBottom: "0.5px solid #F1EFE8" }}>{s.category}</td>
                <td style={{ padding: "12px 16px", borderBottom: "0.5px solid #F1EFE8" }}>
                  <Badge label={s.status} color={statusColor(s.status)} bg={statusBg(s.status)} />
                </td>
                <td style={{ padding: "12px 16px", borderBottom: "0.5px solid #F1EFE8" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: statusBg(s.risk_level), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, color: riskColor(s.risk_level), fontFamily: "'DM Mono', monospace" }}>{s.risk_score}</div>
                    <Badge label={s.risk_level} color={riskColor(s.risk_level)} bg={statusBg(s.risk_level)} />
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: "#5F5E5A", fontFamily: "'DM Mono', monospace", borderBottom: "0.5px solid #F1EFE8" }}>{s.contract_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Supplier detail panel */}
      {selected && (
        <Card style={{ padding: 20, animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#2C2C2A" }}>{selected.name}</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888780" }}>{selected.country} · {selected.category}</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge label={selected.status} color={statusColor(selected.status)} bg={statusBg(selected.status)} />
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888780", lineHeight: 1 }}>×</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ background: "#F9F8F5", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Risk Score</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: riskColor(selected.risk_level), fontFamily: "'DM Mono', monospace" }}>{selected.risk_score}<span style={{ fontSize: 13, fontWeight: 400, color: "#888780" }}>/100</span></div>
              <div style={{ marginTop: 8 }}><Badge label={selected.risk_level} color={riskColor(selected.risk_level)} bg={statusBg(selected.risk_level)} /></div>
            </div>
            <div style={{ background: "#F9F8F5", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Active Contracts</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#2C2C2A", fontFamily: "'DM Mono', monospace" }}>{selected.contract_count}</div>
            </div>
            <div style={{ background: "#F9F8F5", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#888780", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Category</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#2C2C2A", marginTop: 6 }}>{selected.category}</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 6, background: "#F1EFE8", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${selected.risk_score}%`, background: riskColor(selected.risk_level), height: "100%", transition: "width 0.8s ease" }} />
            </div>
          </div>
        </Card>
      )}

      {/* Onboard modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,28,24,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(2px)" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 30, width: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#2C2C2A" }}>Onboard New Supplier</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888780", lineHeight: 1 }}>×</button>
            </div>
            {[
              { label: "Company Name",  key: "name",         placeholder: "e.g. Acme GmbH" },
              { label: "Country",       key: "country",      placeholder: "e.g. Germany" },
              { label: "Category",      key: "category",     placeholder: "e.g. Manufacturing" },
              { label: "Contact Name",  key: "contactName",  placeholder: "Full name" },
              { label: "Contact Email", key: "contactEmail", placeholder: "email@company.com" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 5 }}>{f.label}</label>
                <input
                  value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #D3D1C7", fontSize: 13, boxSizing: "border-box", outline: "none", background: "#FAFAF8" }}
                />
              </div>
            ))}
            <button onClick={handleSave} disabled={saving} style={{
              width: "100%", background: saved ? "#1D9E75" : "#185FA5", color: "#fff",
              border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", marginTop: 8, transition: "background 0.3s",
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : saved ? "✓ Supplier Onboarded — AI validation started" : "Onboard & Start AI Validation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────
function Contracts() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [contracts, setContracts] = useState(MOCK_CONTRACTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const inputRef = useRef(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setAiResults(null);
    setSearchError("");
    try {
      const data = await apiFetch("/contracts/search", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      setAiResults(data.results || []);
    } catch (err) {
      setAiResults([]);
      setSearchError(err.message || "Search failed.");
    }
    setSearching(false);
  };

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/contracts");
      setContracts(data);
    } catch (err) {
      setError(err.message || "Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const filtered = contracts.filter(c => statusFilter === "all" || c.status === statusFilter);

  return (
    <div>
      <SectionHeader title="Contract Intelligence" sub={`Azure AI Search · ${contracts.length} contracts · 10,000+ indexed clauses`} />
      <ErrorBanner message={error} />
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#185FA5", fontSize: 13, marginBottom: 12 }}>
          <Spinner size={14} /> Loading contracts…
        </div>
      )}

      {/* Semantic search panel */}
      <Card style={{ padding: 20, marginBottom: 20, border: "0.5px solid #B5D4F4", background: "#F7FBFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#185FA5" }}>Semantic Contract Search</span>
          <Badge label="Azure AI Search" color="#185FA5" bg="#E6F1FB" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            ref={inputRef} value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder='Try: "penalty clauses for late delivery" or "liability cap exceeding $500k"'
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "0.5px solid #B5D4F4", fontSize: 13, outline: "none", background: "#fff" }}
          />
          <Btn onClick={handleSearch} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Btn>
        </div>

        {searching && (
          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", color: "#185FA5", fontSize: 13 }}>
            <Spinner />
            Querying AI Search index across 10,000+ clauses…
          </div>
        )}

        {searchError && <div style={{ marginTop: 14, fontSize: 13, color: "#D85A30" }}>{searchError}</div>}
        {aiResults && aiResults.length === 0 && !searchError && (
          <div style={{ marginTop: 14, fontSize: 13, color: "#888780" }}>No matching clauses found.</div>
        )}

        {aiResults && aiResults.map((r, i) => (
          <div key={i} style={{ marginTop: 14, background: "#fff", borderRadius: 8, padding: "14px 16px", border: "0.5px solid #B5D4F4", animation: "fadeIn 0.25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "#2C2C2A" }}>{r.contractTitle}</span>
                <span style={{ color: "#888780", fontSize: 12 }}>· {r.supplier}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge label={r.clauseType} color="#185FA5" bg="#E6F1FB" />
                <span style={{ fontSize: 11, color: "#185FA5", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{r.relevanceScore}%</span>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#444441", lineHeight: 1.6, margin: 0 }}>{r.excerpt}</p>
          </div>
        ))}
      </Card>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["all", "active", "expired"].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} style={{
            padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            border: "0.5px solid", cursor: "pointer",
            borderColor: statusFilter === f ? "#185FA5" : "#D3D1C7",
            background: statusFilter === f ? "#E6F1FB" : "#fff",
            color: statusFilter === f ? "#185FA5" : "#5F5E5A",
          }}>{f}</button>
        ))}
      </div>

      {/* Contracts table */}
      <Card style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F9F8F5" }}>
              {["Contract", "Supplier", "Status", "Expiry Date", "Value"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#5F5E5A", borderBottom: "0.5px solid #E5E3DC", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const soon = new Date(c.expiry_date) < new Date(Date.now() + 30 * 86400000);
              return (
                <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#2C2C2A", borderBottom: "0.5px solid #F1EFE8" }}>{c.title}</td>
                  <td style={{ padding: "12px 16px", color: "#5F5E5A", borderBottom: "0.5px solid #F1EFE8" }}>{c.supplier_name}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "0.5px solid #F1EFE8" }}><Badge label={c.status} color={statusColor(c.status)} bg={statusBg(c.status)} /></td>
                  <td style={{ padding: "12px 16px", borderBottom: "0.5px solid #F1EFE8", color: soon && c.status === "active" ? "#D85A30" : "#5F5E5A", fontWeight: soon && c.status === "active" ? 600 : 400 }}>
                    {c.expiry_date} {soon && c.status === "active" && <Badge label="expiring soon" color="#D85A30" bg="#FAECE7" />}
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#2C2C2A", fontWeight: 500, borderBottom: "0.5px solid #F1EFE8" }}>{fmt(c.total_value, c.currency)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
function Documents() {
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [docs, setDocs] = useState(MOCK_DOCS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/documents");
      setDocs(data);
    } catch (err) {
      setError(err.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async () => {
    setUploading(true);
    setError("");
    try {
      const newDoc = await apiFetch("/documents", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: 2,
          filename: "NewVendor_Contract_Draft.pdf",
          doc_type: "contract",
          status: "processing",
        }),
      });
      setDocs(prev => [newDoc, ...prev]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const analyzeDoc = async (doc) => {
    setSelected(doc);
    setAiAnalysis("");
    setValidating(true);
    setError("");
    try {
      const analysis = await apiFetch(`/documents/${doc.id}/validate`, { method: "POST" });
      const lines = [
        `Summary: ${analysis.summary}`,
        "",
        "Key fields:",
        ...(analysis.key_fields?.length ? analysis.key_fields.map(f => `• ${f}`) : ["• None detected"]),
        "",
        "Compliance issues:",
        ...(analysis.issues?.length ? analysis.issues.map(i => `• ${i}`) : ["• None detected"]),
        "",
        `Recommendation: ${analysis.recommendation}`,
      ];
      setAiAnalysis(lines.join("\n"));
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: "validated" } : d));
    } catch (err) {
      setError(err.message || "Error running analysis.");
      setAiAnalysis("Error running analysis. Please try again.");
    }
    setValidating(false);
  };

  const docIcon = (type) => ({ invoice: "🧾", contract: "📄", certification: "🏅", financial: "📊", registration: "🏢" }[type] || "📁");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionHeader title="Document Processing (IDP)" sub="Powered by Hypatos IDP · Claude AI validation" />
        <Btn onClick={handleUpload} disabled={uploading}>
          {uploading ? "Uploading…" : "+ Upload Document"}
        </Btn>
      </div>
      <ErrorBanner message={error} />
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#185FA5", fontSize: 13, marginBottom: 12 }}>
          <Spinner size={14} /> Loading documents…
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Total Docs",  val: docs.length,                                       color: "#185FA5" },
          { label: "Validated",   val: docs.filter(d => d.status === "validated").length,  color: "#1D9E75" },
          { label: "Processing",  val: docs.filter(d => d.status === "processing").length, color: "#BA7517" },
          { label: "Failed",      val: docs.filter(d => d.status === "validation_failed").length, color: "#E24B4A" },
        ].map(s => (
          <Card key={s.label} style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#888780", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Document list */}
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "#F9F8F5", fontSize: 11, fontWeight: 600, color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #E5E3DC" }}>
            Documents ({docs.length})
          </div>
          {docs.map((d, i) => (
            <div key={d.id} onClick={() => analyzeDoc(d)} style={{
              padding: "14px 16px", borderBottom: i < docs.length - 1 ? "0.5px solid #F1EFE8" : "none",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              background: selected?.id === d.id ? "#F0F5FB" : "transparent",
              transition: "background 0.1s",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: statusBg(d.status),
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0,
              }}>
                {docIcon(d.doc_type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.filename}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 3 }}>{d.doc_type} · {d.created_at}</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                {d.status === "processing" ? <Spinner size={14} color="#185FA5" /> : <Badge label={d.status.replace(/_/g, " ")} color={statusColor(d.status)} bg={statusBg(d.status)} />}
              </div>
            </div>
          ))}
        </Card>

        {/* AI Analysis panel */}
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", background: "#F9F8F5", fontSize: 11, fontWeight: 600, color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #E5E3DC" }}>
            AI Analysis
          </div>
          <div style={{ flex: 1, padding: 20 }}>
            {!selected && <EmptyState icon="🤖" title="Click a document to run AI validation" sub="Powered by Claude · Hypatos IDP" />}
            {selected && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#2C2C2A" }}>{selected.filename}</div>
                  <div style={{ fontSize: 12, color: "#888780", marginTop: 4 }}>{selected.doc_type} · {selected.created_at}</div>
                </div>
                {validating && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", color: "#185FA5", fontSize: 13, marginBottom: 14 }}>
                    <Spinner /> Analyzing with Claude AI…
                  </div>
                )}
                {aiAnalysis && !validating && (
                  <div style={{ background: "#F9F8F5", borderRadius: 8, padding: 14, fontSize: 13, color: "#2C2C2A", lineHeight: 1.75, whiteSpace: "pre-wrap", animation: "fadeIn 0.2s ease" }}>
                    {aiAnalysis}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── RISK ASSESSMENT ──────────────────────────────────────────────────────────
function RiskAssessment() {
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    setError("");
    try {
      const data = await apiFetch("/suppliers");
      setSuppliers(data);
    } catch (err) {
      setError(err.message || "Failed to load suppliers.");
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const runAssessment = async (supplier) => {
    setSelected(supplier);
    setLoading(true);
    setAssessment(null);
    setError("");
    try {
      const data = await apiFetch("/risk/assess", {
        method: "POST",
        body: JSON.stringify({ supplier_id: supplier.id }),
      });
      setAssessment(data);
    } catch (err) {
      setError(err.message || "Risk assessment failed.");
      setAssessment({
        score: supplier.risk_score,
        level: supplier.risk_level,
        factors: [],
        recommendations: ["Fallback to stored risk score due to assessment error."],
      });
    }
    setLoading(false);
  };

  return (
    <div>
      <SectionHeader title="Risk Assessment Agent" sub="Autonomous AI-powered supplier risk intelligence" />
      <ErrorBanner message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
        {/* Supplier selector */}
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "#F9F8F5", fontSize: 11, fontWeight: 600, color: "#5F5E5A", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #E5E3DC" }}>
            Select Supplier
          </div>
          {loadingSuppliers && (
            <div style={{ padding: "14px", fontSize: 12, color: "#888780" }}>Loading suppliers…</div>
          )}
          {!loadingSuppliers && suppliers.map(s => (
            <div key={s.id} onClick={() => runAssessment(s)} style={{
              padding: "12px 14px", cursor: "pointer",
              background: selected?.id === s.id ? "#F0F5FB" : "transparent",
              borderBottom: "0.5px solid #F1EFE8", transition: "background 0.1s",
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#2C2C2A" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{s.country} · {s.category}</div>
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor(s.risk_level), flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: riskColor(s.risk_level), fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{s.risk_score}/100</span>
                <Badge label={s.risk_level} color={riskColor(s.risk_level)} bg={statusBg(s.risk_level)} />
              </div>
            </div>
          ))}
        </Card>

        {/* Assessment panel */}
        <Card style={{ padding: 24 }}>
          {!assessment && !loading && (
            <EmptyState icon="🔍" title="Select a supplier to run AI risk assessment" sub="The agent evaluates financial, compliance, geopolitical & operational risk" />
          )}

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 16 }}>
              <Spinner size={40} />
              <div style={{ fontSize: 14, color: "#5F5E5A", fontWeight: 500 }}>AI agent analyzing {selected?.name}…</div>
              <div style={{ fontSize: 12, color: "#888780", textAlign: "center" }}>Evaluating financial · compliance · geopolitical · operational risk</div>
            </div>
          )}

          {assessment && !loading && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#2C2C2A" }}>{selected?.name}</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888780" }}>{selected?.country} · {selected?.category}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 42, fontWeight: 700, color: riskColor(assessment.level), fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{assessment.score}</div>
                  <Badge label={assessment.level} color={riskColor(assessment.level)} bg={statusBg(assessment.level)} />
                </div>
              </div>

              <div style={{ height: 8, background: "#F1EFE8", borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ width: `${assessment.score}%`, background: riskColor(assessment.level), height: "100%", borderRadius: 4, transition: "width 0.8s ease" }} />
              </div>

              <div style={{ marginBottom: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#2C2C2A", marginBottom: 12, letterSpacing: "-0.01em" }}>Risk Factors</div>
                {assessment.factors.map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "11px 14px", background: "#F9F8F5", borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: "#888780", marginTop: 3, lineHeight: 1.5 }}>{f.detail}</div>
                    </div>
                    <Badge label={f.impact} color={riskColor(f.impact === "high" ? "high" : f.impact === "medium" ? "medium" : "low")} bg={statusBg(f.impact === "high" ? "high" : f.impact === "medium" ? "medium" : "low")} />
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#2C2C2A", marginBottom: 12 }}>Recommendations</div>
                {assessment.recommendations.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#185FA5", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div style={{ fontSize: 13, color: "#444441", lineHeight: 1.65 }}>{r}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── NEGOTIATION ──────────────────────────────────────────────────────────────
function Negotiation() {
  const [supplierId, setSupplierId] = useState(1);
  const [suppliers, setSuppliers] = useState(MOCK_SUPPLIERS);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [scenario, setScenario] = useState("price_reduction");
  const [context, setContext] = useState("");
  const [email, setEmail] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [suppliersError, setSuppliersError] = useState("");

  const scenarios = [
    { val: "price_reduction",  label: "Price Reduction Request" },
    { val: "delivery_delay",   label: "Late Delivery Dispute" },
    { val: "contract_renewal", label: "Contract Renewal" },
    { val: "quality_issue",    label: "Quality Non-Conformance" },
    { val: "payment_terms",    label: "Extended Payment Terms" },
  ];

  const supplier = suppliers.find(s => s.id === Number(supplierId));
  const fetchSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    setSuppliersError("");
    try {
      const data = await apiFetch("/suppliers");
      setSuppliers(data);
    } catch (err) {
      setSuppliersError(err.message || "Failed to load suppliers.");
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (!suppliers.length) return;
    const activeSuppliers = suppliers.filter(s => s.status === "active");
    const preferred = activeSuppliers[0] || suppliers[0];
    if (preferred && !suppliers.find(s => s.id === Number(supplierId))) {
      setSupplierId(preferred.id);
    }
  }, [suppliers, supplierId]);

  const draft = async () => {
    setEmail("");
    setStreaming(true);
    setError("");
    try {
      const res = await apiStream("/negotiation/stream", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: supplier?.id,
          scenario,
          context,
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setEmail(prev => prev + chunk);
        }
      }
    } catch (err) {
      try {
        const data = await apiFetch("/negotiation/draft", {
          method: "POST",
          body: JSON.stringify({
            supplier_id: supplier?.id,
            scenario,
            context,
          }),
        });
        setEmail(data.email);
      } catch (fallbackErr) {
        setError(fallbackErr.message || err.message || "Drafting failed.");
      }
    } finally {
      setStreaming(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <SectionHeader title="Negotiation Assistant" sub="AI-powered procurement email drafter" />
      <ErrorBanner message={suppliersError || error} />

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
        {/* Config panel */}
        <Card style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Supplier</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} disabled={loadingSuppliers} style={{
              width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #D3D1C7",
              fontSize: 13, background: "#fff", outline: "none", cursor: loadingSuppliers ? "not-allowed" : "pointer",
              opacity: loadingSuppliers ? 0.7 : 1,
            }}>
              {(suppliers.filter(s => s.status === "active").length ? suppliers.filter(s => s.status === "active") : suppliers).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {supplier && (
            <div style={{ background: "#F9F8F5", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 12 }}>
              <div style={{ color: "#5F5E5A", marginBottom: 6 }}>{supplier.country} · {supplier.category}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge label={supplier.status} color={statusColor(supplier.status)} bg={statusBg(supplier.status)} />
                <Badge label={`${supplier.risk_level} risk`} color={riskColor(supplier.risk_level)} bg={statusBg(supplier.risk_level)} />
                <Badge label={`Score: ${supplier.risk_score}`} color="#185FA5" bg="#E6F1FB" />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scenario</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {scenarios.map(s => (
                <button key={s.val} onClick={() => setScenario(s.val)} style={{
                  textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "0.5px solid",
                  borderColor: scenario === s.val ? "#185FA5" : "#D3D1C7",
                  background: scenario === s.val ? "#E6F1FB" : "#fff",
                  color: scenario === s.val ? "#185FA5" : "#444441",
                  fontSize: 13, fontWeight: scenario === s.val ? 600 : 400, cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Additional Context</label>
            <textarea
              value={context} onChange={e => setContext(e.target.value)}
              placeholder="e.g. Q3 volume was 12% below SLA target, seeking 8% cost reduction…"
              style={{ width: "100%", height: 90, padding: "9px 12px", borderRadius: 8, border: "0.5px solid #D3D1C7", fontSize: 13, resize: "none", boxSizing: "border-box", fontFamily: "inherit", outline: "none", background: "#FAFAF8" }}
            />
          </div>

          <Btn onClick={draft} disabled={streaming} style={{ width: "100%", justifyContent: "center" }}>
            {streaming ? <><Spinner size={14} color="#fff" /> Drafting…</> : "✍ Draft Negotiation Email"}
          </Btn>
        </Card>

        {/* Email output */}
        <Card style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 20px", borderBottom: "0.5px solid #F1EFE8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#5F5E5A" }}>Generated Email</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {streaming && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#185FA5" }}><Spinner size={12} /> Generating…</div>}
              {email && !streaming && (
                <button onClick={copy} style={{
                  background: copied ? "#E1F5EE" : "#F9F8F5", border: "0.5px solid #D3D1C7",
                  borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600,
                  color: copied ? "#0F6E56" : "#5F5E5A", cursor: "pointer", transition: "all 0.2s",
                }}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>
          <div style={{ flex: 1, padding: "20px 24px", minHeight: 340 }}>
            {!email && !streaming && (
              <EmptyState icon="✉️" title='Configure the negotiation and click "Draft Email"' sub="Generated by the backend AI service" />
            )}
            {(email || streaming) && (
              <pre style={{ fontSize: 13, lineHeight: 1.75, color: "#2C2C2A", whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
                {email}
                {streaming && <span style={{ display: "inline-block", width: 2, height: 14, background: "#185FA5", animation: "blink 1s step-end infinite", verticalAlign: "middle", marginLeft: 2 }} />}
              </pre>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",   label: "Dashboard",    icon: "📊" },
  { id: "suppliers",   label: "Suppliers",    icon: "🏢" },
  { id: "contracts",   label: "Contracts",    icon: "📄" },
  { id: "documents",   label: "Documents",    icon: "🗂" },
  { id: "risk",        label: "Risk Intel",   icon: "🛡" },
  { id: "negotiation", label: "Negotiation",  icon: "✉️" },
];

function LoginScreen({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#F5F4EF" }}>
      <Card style={{ padding: 28, width: 420 }}>
        <div style={{ fontSize: 13, color: "#888780", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Authentication</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#2C2C2A", marginBottom: 8 }}>Sign in to AVME</div>
        <div style={{ fontSize: 13, color: "#5F5E5A", lineHeight: 1.6, marginBottom: 18 }}>
          Use your Microsoft Entra ID account to access procurement insights and AI workflows.
        </div>
        <Btn onClick={onLogin} style={{ width: "100%", justifyContent: "center" }}>Sign in with Microsoft</Btn>
      </Card>
    </div>
  );
}

function AppShell({ view, setView, View, onLogout }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F4EF" }}>
      {/* Sidebar */}
      <div style={{ width: 224, background: "#1A1A18", flexShrink: 0, display: "flex", flexDirection: "column", padding: "0", position: "sticky", top: 0, height: "100vh" }}>
        {/* Brand */}
        <div style={{ padding: "22px 20px 20px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, background: "#185FA5", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚙</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>AVME</div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>Autonomous Vendor<br />Management Ecosystem</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 10px", marginBottom: 8 }}>Platform</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, marginBottom: 2,
              background: view === n.id ? "rgba(24,95,165,0.32)" : "transparent",
              border: view === n.id ? "0.5px solid rgba(24,95,165,0.45)" : "0.5px solid transparent",
              color: view === n.id ? "#85B7EB" : "rgba(255,255,255,0.5)",
              fontSize: 13, fontWeight: view === n.id ? 600 : 400,
              cursor: "pointer", textAlign: "left", transition: "all 0.12s",
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 20px 18px", borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>All systems operational</span>
          </div>
          {onLogout && (
            <button onClick={onLogout} style={{
              marginTop: 12,
              width: "100%",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "0.5px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.75)",
              background: "transparent",
              cursor: "pointer",
            }}>
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 28, overflow: "auto", minHeight: "100vh" }}>
        <div style={{ animation: "fadeIn 0.2s ease" }} key={view}>
          <View />
        </div>
      </div>
    </div>
  );
}

function AppAuth() {
  const { instance, accounts } = useMsal();
  const [view, setView] = useState("dashboard");
  const VIEWS = { project: ProjectOverview, dashboard: Dashboard, suppliers: Suppliers, contracts: Contracts, documents: Documents, risk: RiskAssessment, negotiation: Negotiation };
  const View = VIEWS[view];

  useEffect(() => {
    if (!instance.getActiveAccount() && accounts.length) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, instance]);

  const login = () => instance.loginPopup(loginRequest);
  const logout = () => instance.logoutPopup();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; background: #F5F4EF; color: #2C2C2A; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D3D1C7; border-radius: 2px; }
        select { appearance: none; }
      `}</style>
      <AuthenticatedTemplate>
        <AppShell view={view} setView={setView} View={View} onLogout={logout} />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <LoginScreen onLogin={login} />
      </UnauthenticatedTemplate>
    </>
  );
}

function AppNoAuth() {
  const [view, setView] = useState("dashboard");
  const VIEWS = { project: ProjectOverview, dashboard: Dashboard, suppliers: Suppliers, contracts: Contracts, documents: Documents, risk: RiskAssessment, negotiation: Negotiation };
  const View = VIEWS[view];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; background: #F5F4EF; color: #2C2C2A; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D3D1C7; border-radius: 2px; }
        select { appearance: none; }
      `}</style>
      <AppShell view={view} setView={setView} View={View} />
    </>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  return AUTH_ENABLED ? <AppAuth /> : <AppNoAuth />;
}
