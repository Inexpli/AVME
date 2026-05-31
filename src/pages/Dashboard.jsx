import { useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { MOCK_CONTRACTS, MOCK_KPIS } from "../data/mocks.js";
import { Bar } from "../components/ui/Bar.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx";
import { KpiCard } from "../components/ui/KpiCard.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { fmt, pct } from "../utils/format.js";

export default function Dashboard() {
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
