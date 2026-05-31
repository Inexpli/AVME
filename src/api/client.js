import { API_BASE } from "../config/env.js";
import { getAccessToken } from "./authToken.js";

export async function apiFetch(path, options = {}) {
  const token = await getAccessToken();
  const hasBody = options.body && !(options.body instanceof FormData);
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const headers = hasBody
    ? { "Content-Type": "application/json", ...authHeader, ...options.headers }
    : { ...authHeader, ...options.headers };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.detail ? String(data.detail) : JSON.stringify(data);
    } catch (err) {
      detail = await res.text();
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function apiStream(path, options = {}) {
  const token = await getAccessToken();
  const hasBody = options.body && !(options.body instanceof FormData);
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const headers = hasBody
    ? { "Content-Type": "application/json", ...authHeader, ...options.headers }
    : { ...authHeader, ...options.headers };
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
