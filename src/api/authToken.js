import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest, msalInstance } from "../authConfig.js";
import { AUTH_ENABLED } from "../config/env.js";

export async function getAccessToken() {
  if (!AUTH_ENABLED) return null;
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) return null;
  if (!loginRequest.scopes || loginRequest.scopes.length === 0) {
    throw new Error("Azure AD scope is not configured.");
  }
  try {
    const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      const result = await msalInstance.acquireTokenPopup({ ...loginRequest, account });
      return result.accessToken;
    }
    throw err;
  }
}
