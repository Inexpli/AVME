import { pct } from "../../utils/format.js";

export function Bar({ value, max, color }) {
  return (
    <div style={{ background: "#ECEAE3", borderRadius: 4, height: 5, overflow: "hidden" }}>
      <div style={{ width: `${pct(value, max)}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}
