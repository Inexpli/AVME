export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
export const AUTH_ENABLED = (import.meta.env.VITE_AAD_ENABLED ?? "true").toLowerCase() === "true";
