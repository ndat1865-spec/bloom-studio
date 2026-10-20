import { SERVER_ORIGIN } from "./api";

/** Tien VND: "680.000 ₫" — dong khong co phan le. */
const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/**
 * Gia hien thi theo VND — cung don vi voi VNPay / MoMo / ZaloPay va phi GHN.
 * Lam tron ve dong: cac cong thanh toan chi nhan so nguyen.
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return vnd.format(Math.round(value));
}

export const FALLBACK_IMAGE = "/images/placeholder.svg";

/**
 * Chuan hoa imageUrl tu backend thanh URL mo duoc.
 * Backend luu dang "uploads/<uuid>_<ten>.jpg" (khong co dau '/' dau),
 * ham nay ghep dung mot lan, khong lap "uploads/" hay dau '/'.
 */
export function resolveImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl || !imageUrl.trim()) return FALLBACK_IMAGE;
  const raw = imageUrl.trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/images/")) return raw;
  return `${SERVER_ORIGIN}/${raw.replace(/^\/+/, "")}`;
}
