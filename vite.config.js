import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // reportGenerator chunk (html2canvas + jsPDF) is ~594kB but lazy-loaded only on PDF generation
    chunkSizeWarningLimit: 600,
  },
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
