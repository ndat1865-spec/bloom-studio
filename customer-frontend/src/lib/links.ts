/**
 * Dia chi giao dien quan tri (admin-frontend).
 *
 * Hai frontend chay o hai cong khac nhau nen localStorage KHONG dung chung:
 * sang ben kia la phai dang nhap lai bang tai khoan ADMIN.
 */
export const ADMIN_APP_URL = (import.meta.env.VITE_ADMIN_APP_URL ?? "http://localhost:5174").replace(
  /\/+$/,
  "",
);
