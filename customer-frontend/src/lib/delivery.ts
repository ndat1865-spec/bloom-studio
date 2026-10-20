import type { OrderOptions } from "./api";

/**
 * Quy tac giao hoa tuoi phia giao dien — PHAI khop DeliveryPolicy cua order-service.
 * Server van kiem tra lai khi dat hang; o day chi de khach khong chon phai ngay khong giao duoc.
 *
 * "Hom nay" lay tu server (options.today, gio Viet Nam) chu khong tu dong ho may khach.
 */

/** Cong them so ngay vao chuoi yyyy-MM-dd, khong qua mui gio. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Ngay giao som nhat: da qua gio chot thi tu ngay mai; hoa can dat truoc thi cong them. */
export function earliestDeliveryDate(options: OrderOptions, leadDays: number): string {
  const days = Math.max(leadDays, options.sameDayOpen ? 0 : 1);
  return addDays(options.today, days);
}

/** "2026-09-30" -> "30/09". */
export function formatDay(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

/** Cach goi ngay giao cho de doc: "hôm nay", "ngày mai" hoac "30/09". */
export function describeDay(options: OrderOptions, isoDate: string): string {
  if (isoDate === options.today) return "hôm nay";
  if (isoDate === addDays(options.today, 1)) return "ngày mai";
  return `ngày ${formatDay(isoDate)}`;
}
