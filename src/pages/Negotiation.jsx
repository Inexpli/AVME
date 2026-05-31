import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiStream } from "../api/client.js";
import { MOCK_SUPPLIERS } from "../data/mocks.js";
import { Badge } from "../components/ui/Badge.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { riskColor, statusBg, statusColor } from "../utils/status.js";

export default function Negotiation() {
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
