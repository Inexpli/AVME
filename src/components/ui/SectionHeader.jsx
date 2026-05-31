export function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#2C2C2A", letterSpacing: "-0.02em" }}>{title}</h2>
      {sub && <p style={{ fontSize: 13, color: "#888780", margin: "5px 0 0", lineHeight: 1.4 }}>{sub}</p>}
    </div>
  );
}
