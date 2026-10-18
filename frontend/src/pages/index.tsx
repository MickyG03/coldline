import { createBrowserRouter } from "react-router-dom";

// Router only: each route points at a page component in src/features.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Coldline</div>,
  },
]);
