import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const mapsKey = env.VITE_GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY;
  if (!env.VITE_GOOGLE_MAPS_API_KEY && mapsKey) {
    console.warn("[coldline] VITE_GOOGLE_MAPS_API_KEY not set; using GOOGLE_MAPS_API_KEY. Add the VITE_ line to .env.");
  }
  return {
    plugins: [react()],
    // Read VITE_* variables from the repo-root .env.
    envDir: "..",
    define: mapsKey ? { "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(mapsKey) } : {},
    server: {
      proxy: {
        // GraphQL (queries, mutations and SSE subscriptions) -> backend/src/server.
        "/graphql": `http://localhost:${env.COLDLINE_API_PORT || 4000}`,
      },
    },
  };
});
