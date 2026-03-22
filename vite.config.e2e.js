/**
 * Vite config for E2E test builds.
 * Builds in 'development' mode so import.meta.env.DEV === true,
 * which activates the ?devRole=coach|player auth bypass in AuthContext.
 * 
 * Usage: npx vite build --config vite.config.e2e.js
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  mode: 'development',
  build: {
    chunkSizeWarningLimit: 600,
    minify: false,            // Easier to debug test failures
    outDir: 'dist',
  },
  define: {
    // Ensure DEV is true in the built output
    'import.meta.env.DEV': 'true',
    'import.meta.env.PROD': 'false',
  },
});
