import { NAV } from "../../constants/navigation.js";

export function AppShell({ view, setView, View, onLogout }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F4EF" }}>
      <div style={{ width: 224, background: "#1A1A18", flexShrink: 0, display: "flex", flexDirection: "column", padding: "0", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px 20px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, background: "#185FA5", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚙</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>AVME</div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>Autonomous Vendor<br />Management Ecosystem</div>
        </div>

        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 10px", marginBottom: 8 }}>Platform</div>
          {NAV.map(n => (
            <button key={n.id} type="button" onClick={() => setView(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, marginBottom: 2,
              background: view === n.id ? "rgba(24,95,165,0.32)" : "transparent",
              border: view === n.id ? "0.5px solid rgba(24,95,165,0.45)" : "0.5px solid transparent",
              color: view === n.id ? "#85B7EB" : "rgba(255,255,255,0.5)",
              fontSize: 13, fontWeight: view === n.id ? 600 : 400,
              cursor: "pointer", textAlign: "left", transition: "all 0.12s",
            }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "14px 20px 18px", borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>All systems operational</span>
          </div>
          {onLogout && (
            <button type="button" onClick={onLogout} style={{
              marginTop: 12,
              width: "100%",
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "0.5px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.75)",
              background: "transparent",
              cursor: "pointer",
            }}>
              Sign out
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, padding: 28, overflow: "auto", minHeight: "100vh" }}>
        <div style={{ animation: "fadeIn 0.2s ease" }} key={view}>
          <View />
        </div>
      </div>
    </div>
  );
}
