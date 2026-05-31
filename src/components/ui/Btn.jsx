export function Btn({ onClick, disabled, children, variant = "primary", style: s = {} }) {
  const base = {
    border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13,
    fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", gap: 7, transition: "opacity 0.15s",
    opacity: disabled ? 0.65 : 1, ...s,
  };
  const variants = {
    primary: { background: "#185FA5", color: "#fff" },
    secondary: { background: "#F1EFE8", color: "#444441", border: "0.5px solid #D3D1C7" },
    ghost: { background: "transparent", color: "#5F5E5A", border: "0.5px solid #D3D1C7" },
    success: { background: "#1D9E75", color: "#fff" },
    danger: { background: "#E24B4A", color: "#fff" },
  };
  return <button type="button" onClick={!disabled ? onClick : undefined} style={{ ...base, ...variants[variant] }}>{children}</button>;
}
