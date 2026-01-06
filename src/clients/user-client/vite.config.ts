import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
  server: {
    port: 5174,
    allowedHosts: ["fso-banking-dev.antok.dev"],
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        configure(proxy, _options) {
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            const forwarded = req.headers["x-forwarded-for"] as string;
            const ip = forwarded ? forwarded : req.socket.remoteAddress;
            proxyReq.setHeader("X-Forwarded-For", ip || "");
            proxyReq.setHeader("X-Real-IP", ip || "");
          });
        },
      },
    },
  },
});
