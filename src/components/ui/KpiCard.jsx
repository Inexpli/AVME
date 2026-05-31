export function KpiCard({ label, value, sub, accent, icon }) {
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
