import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { MOCK_SUPPLIERS } from "../data/mocks.js";
import { Badge } from "../components/ui/Badge.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { riskColor, statusBg, statusColor } from "../utils/status.js";

export default function Suppliers() {
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
