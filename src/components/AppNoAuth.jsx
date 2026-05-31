import { useState } from "react";
import { VIEWS } from "../constants/views.js";
import { AppShell } from "./layout/AppShell.jsx";

export default function AppNoAuth() {
  const [view, setView] = useState("dashboard");
  const View = VIEWS[view];

  return <AppShell view={view} setView={setView} View={View} />;
}
