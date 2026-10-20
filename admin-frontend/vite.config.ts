import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  server: {
    // 5173 la cua customer-frontend, 5174 la cua app quan tri nay.
    port: 5174,
    // strictPort: bao loi ngay neu 5174 dang ban, thay vi lang le nhay sang cong khac.
    //
    // De false thi trang van mo duoc nhung MOI loi goi API bi CORS chan, vi Gateway
    // chi cho phep dung hai origin 5173 va 5174. Giao dien bao "Khong the ket noi toi
    // server" - chi sai huong hoan toan, vi backend van chay tot.
    strictPort: true,
  },
});
