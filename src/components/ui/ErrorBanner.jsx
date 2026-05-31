export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: "#FCEBEB",
      border: "0.5px solid #F4B7B7",
      color: "#A62929",
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 12,
      marginBottom: 16,
    }}>
      {message}
    </div>
  );
}
