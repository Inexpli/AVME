import { AUTH_ENABLED } from "./config/env.js";
import AppAuth from "./components/AppAuth.jsx";
import AppNoAuth from "./components/AppNoAuth.jsx";

export default function App() {
  return AUTH_ENABLED ? <AppAuth /> : <AppNoAuth />;
}
