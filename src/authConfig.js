import { EventType, PublicClientApplication } from "@azure/msal-browser";

const tenantId = import.meta.env.VITE_AAD_TENANT_ID;
const clientId = import.meta.env.VITE_AAD_CLIENT_ID;
const redirectUri = import.meta.env.VITE_AAD_REDIRECT_URI || window.location.origin;
const authority = tenantId ? `https://login.microsoftonline.com/${tenantId}` : undefined;
const defaultScope = clientId ? `api://${clientId}/access_as_user` : "";
const scope = import.meta.env.VITE_AAD_SCOPE || defaultScope;

export const msalConfig = {
  auth: {
    clientId: clientId || "",
    authority,
    redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: scope ? [scope] : [],
};

export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
    msalInstance.setActiveAccount(event.payload.account);
  }
});
