/**
 * Dia chi giao dien khach hang (customer-frontend).
 *
 * Hai frontend chay o hai cong khac nhau nen localStorage KHONG dung chung:
 * sang ben kia la phai dang nhap lai. Vi vay chi dung cho link "Xem cua hang".
 */
export const SHOP_APP_URL = (import.meta.env.VITE_SHOP_APP_URL ?? "http://localhost:5173").replace(
  /\/+$/,
  "",
);
