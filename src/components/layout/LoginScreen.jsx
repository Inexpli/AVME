import { Btn } from "../ui/Btn.jsx";
import { Card } from "../ui/Card.jsx";

export function LoginScreen({ onLogin }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#F5F4EF" }}>
      <Card style={{ padding: 28, width: 420 }}>
        <div style={{ fontSize: 13, color: "#888780", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Authentication</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#2C2C2A", marginBottom: 8 }}>Sign in to AVME</div>
        <div style={{ fontSize: 13, color: "#5F5E5A", lineHeight: 1.6, marginBottom: 18 }}>
          Use your Microsoft Entra ID account to access procurement insights and AI workflows.
        </div>
        <Btn onClick={onLogin} style={{ width: "100%", justifyContent: "center" }}>Sign in with Microsoft</Btn>
      </Card>
    </div>
  );
}
