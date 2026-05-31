export function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#5F5E5A", marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "#B4B2A9" }}>{sub}</div>}
    </div>
  );
}
