import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // During development, calls to /api are forwarded to the Express server,
    // so the browser only ever talks to one address.
    proxy: {
      "/api": "http://localhost:5000"
    }
  }
});
