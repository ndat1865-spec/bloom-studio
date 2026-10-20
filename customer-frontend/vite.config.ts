import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import fs from "node:fs";
import path from "node:path";

// `npm run dev:https` (mode "https") chay https://localhost:5173.
//
// Can cho ZaloPay: trang ket qua cua ZaloPay chi dua khach ve redirecturl bat dau bang
// https:// - gap http://localhost thi chan lai va dung yen o trang cua ho. VNPay va MoMo
// khong kiem nhu vay nen `npm run dev` (http) van chay binh thuong voi hai cong do.
// Chay https thi PAYMENT_RETURN_URL cua payment-service cung phai la https.
//
// Chung chi: co .cert/localhost.pem + .cert/localhost-key.pem (tao bang mkcert, xem README
// cua thu muc nay) thi dung chung chi do - trinh duyet tin, hien o khoa binh thuong. Chua co
// thi lui ve chung chi tu ky cua basicSsl - van chay nhung Chrome bao "Khong bao mat".
// Thu muc .cert KHONG commit (moi may tu tao, khoa rieng khong duoc chia se).
const certFile = path.resolve(__dirname, ".cert/localhost.pem");
const keyFile = path.resolve(__dirname, ".cert/localhost-key.pem");
const trustedCert = fs.existsSync(certFile) && fs.existsSync(keyFile);

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === "https" && !trustedCert ? [basicSsl()] : [])],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          gsap: ["gsap", "@gsap/react"],
        },
      },
    },
  },
  server: {
    // 5173 la cua customer-frontend nay, 5174 la cua admin-frontend.
    port: 5173,
    // strictPort: bao loi ngay neu 5173 dang ban, thay vi lang le nhay sang 5174.
    //
    // De false thi vite nhay sang 5174 - dung cong cua admin-frontend - va neu admin
    // dang chay thi hai app giam chan nhau. Gateway chi cho phep dung hai origin 5173
    // va 5174. Giao dien bao "Khong the ket noi toi server,
    // kiem tra backend da chay chua" - chi sai huong hoan toan, vi backend van chay tot.
    // Hong som va hong ro rang thi de tim hon nhieu.
    strictPort: true,
    https:
      mode === "https" && trustedCert
        ? { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }
        : undefined,
  },
}));
