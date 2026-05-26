import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import App from "./App.jsx";
import { msalInstance } from "./authConfig.js";
import "./index.css";

const AUTH_ENABLED = (import.meta.env.VITE_AAD_ENABLED ?? "true").toLowerCase() === "true";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {AUTH_ENABLED ? (
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

