import { createBrowserRouter } from "react-router-dom";
import { DashboardPage } from "../features/dashboard/DashboardPage.tsx";

// Router only: each route points at a page component in src/features.
export const router = createBrowserRouter([
  { path: "/", element: <DashboardPage /> },
  // SMS approval links: /incidents/:incidentId#approve
  { path: "/incidents/:incidentId", element: <DashboardPage /> },
]);
