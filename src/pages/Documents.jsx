import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client.js";
import { MOCK_DOCS } from "../data/mocks.js";
import { Badge } from "../components/ui/Badge.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { Card } from "../components/ui/Card.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { statusBg, statusColor } from "../utils/status.js";

export default function Documents() {
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
