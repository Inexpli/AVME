import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../api/client.js";
import { MOCK_CONTRACTS } from "../data/mocks.js";
import { Badge } from "../components/ui/Badge.jsx";
import { Btn } from "../components/ui/Btn.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ErrorBanner } from "../components/ui/ErrorBanner.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { fmt } from "../utils/format.js";
import { statusBg, statusColor } from "../utils/status.js";

export default function Contracts() {
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
