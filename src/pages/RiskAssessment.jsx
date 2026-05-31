import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { MOCK_SUPPLIERS } from "../data/mocks.js";
import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { riskColor, statusBg } from "../utils/status.js";

export default function RiskAssessment() {
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
