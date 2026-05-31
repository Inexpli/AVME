import { Badge } from "../components/ui/Badge.jsx";
import { Card } from "../components/ui/Card.jsx";
import { SectionHeader } from "../components/ui/SectionHeader.jsx";
import {
  PROJECT_CAPABILITIES,
  PROJECT_ENVIRONMENT,
  PROJECT_META,
  PROJECT_RESPONSIBILITIES,
  PROJECT_STATS,
} from "../data/projectContent.js";

export default function ProjectOverview() {
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
