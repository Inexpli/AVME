import { useEffect, useState } from "react";
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig.js";
import { VIEWS } from "../constants/views.js";
import { AppShell } from "./layout/AppShell.jsx";
import { LoginScreen } from "./layout/LoginScreen.jsx";

export default function AppAuth() {
  const { instance, accounts } = useMsal();
  const [view, setView] = useState("dashboard");
  const View = VIEWS[view];

  useEffect(() => {
    if (!instance.getActiveAccount() && accounts.length) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, instance]);

  const login = () => instance.loginPopup(loginRequest);
  const logout = () => instance.logoutPopup();

  return (
    <>
      <AuthenticatedTemplate>
        <AppShell view={view} setView={setView} View={View} onLogout={logout} />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <LoginScreen onLogin={login} />
      </UnauthenticatedTemplate>
    </>
  );
}
