export function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #E5E3DC", borderRadius: 10, ...style }}>
      {children}
    </div>
  );
}
