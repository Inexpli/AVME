import Contracts from "../pages/Contracts.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Documents from "../pages/Documents.jsx";
import Negotiation from "../pages/Negotiation.jsx";
import ProjectOverview from "../pages/ProjectOverview.jsx";
import RiskAssessment from "../pages/RiskAssessment.jsx";
import Suppliers from "../pages/Suppliers.jsx";

export const VIEWS = {
  project: ProjectOverview,
  dashboard: Dashboard,
  suppliers: Suppliers,
  contracts: Contracts,
  documents: Documents,
  risk: RiskAssessment,
  negotiation: Negotiation,
};
