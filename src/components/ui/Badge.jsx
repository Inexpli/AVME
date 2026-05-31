export function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      background: bg, color, whiteSpace: "nowrap",
    }}>
      {String(label).replace(/_/g, " ")}
    </span>
  );
}
