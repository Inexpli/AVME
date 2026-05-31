export const fmt = (n, cur = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
