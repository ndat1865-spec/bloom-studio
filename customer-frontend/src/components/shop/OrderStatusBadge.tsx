import { cn } from "@/lib/utils";

/**
 * Nhan trang thai don hang.
 * Mau KHONG phai kenh duy nhat: chu tieng Viet luon di kem (quy tac trong DESIGN.md).
 */
const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chờ xác nhận", className: "border-border-strong text-muted-foreground" },
  CONFIRMED: { label: "Đã xác nhận", className: "border-foreground/60 text-foreground" },
  PREPARING: { label: "Đang cắm hoa", className: "border-accent text-accent" },
  SHIPPING: { label: "Đang giao", className: "border-accent bg-accent text-background" },
  DELIVERED: { label: "Đã giao", className: "border-success text-success" },
  CANCELLED: { label: "Đã huỷ", className: "border-danger text-danger" },
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = STATUS[status] ?? {
    label: status,
    className: "border-border-strong text-muted-foreground",
  };
  return (
    <span
      className={cn("label-micro inline-flex border px-3 py-2", entry.className, className)}
    >
      {entry.label}
    </span>
  );
}

export const ORDER_STATUSES = Object.keys(STATUS);
export const ORDER_STATUS_LABELS = STATUS;
