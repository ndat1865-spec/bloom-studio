import type { Order } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Nhan trang thai don hang dang vien thuoc co cham mau.
 * Mau KHONG phai kenh duy nhat: chu tieng Viet luon di kem.
 * Moi trang thai mot mau rieng de quet bang nhanh: cho xac nhan = canh bao,
 * da xac nhan = trung tinh, dang chuan bi = mau nhan, dang giao = thong tin,
 * da giao = thanh cong, huy = loi.
 */
const STATUS: Record<string, { label: string; className: string; dot: string }> = {
  PENDING: {
    label: "Chờ xác nhận",
    className: "bg-warning/12 text-warning ring-warning/25",
    dot: "bg-warning",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    className: "bg-surface-raised text-foreground ring-border-strong",
    dot: "bg-foreground",
  },
  PREPARING: {
    label: "Đang cắm hoa",
    className: "bg-accent/12 text-accent ring-accent/25",
    dot: "bg-accent",
  },
  SHIPPING: {
    label: "Đang giao",
    className: "bg-info/12 text-info ring-info/25",
    dot: "bg-info",
  },
  DELIVERED: {
    label: "Đã giao",
    className: "bg-success/12 text-success ring-success/25",
    dot: "bg-success",
  },
  CANCELLED: {
    label: "Đã huỷ",
    className: "bg-danger/12 text-danger ring-danger/25",
    dot: "bg-danger",
  },
};

const FALLBACK = {
  className: "bg-surface-raised text-muted-foreground ring-border",
  dot: "bg-muted-foreground",
};

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = STATUS[status] ?? { label: status, ...FALLBACK };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        entry.className,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", entry.dot)} />
      {entry.label}
    </span>
  );
}

export const ORDER_STATUSES = Object.keys(STATUS);
export const ORDER_STATUS_LABELS = STATUS;

/** Cac buoc tien trinh theo thu tu - khop voi OrderStatus o order-service. Huy nam ngoai. */
export const ORDER_STEPS = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPING", "DELIVERED"] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];

/** Vi tri trong tien trinh; -1 voi don da huy / trang thai la. */
export function stepIndex(status: string): number {
  return (ORDER_STEPS as readonly string[]).indexOf(status);
}

/** Don co van don GHN chua huy. */
export function hasActiveShipment(order: Pick<Order, "ghnOrderCode" | "shippingStatus">): boolean {
  return Boolean(order.ghnOrderCode) && order.shippingStatus !== "cancel";
}

/** Trang thai GHN khi shipper CHUA lay hang - con huy van don duoc. */
export function beforePickup(shippingStatus: string | null): boolean {
  return ["ready_to_pick", "picking", "money_collect_picking"].includes(shippingStatus ?? "");
}

/**
 * Cac trang thai duoc chon cho mot don - cung quy tac voi OrderService.updateStatus:
 * chi di toi; don tra truc tuyen chua nhan tien thi dung o "Da xac nhan"; huy duoc
 * khi hoa chua roi cua hang. Backend van tu kiem tra lai, day chi de khong hien lua
 * chon chac chan bi tu choi.
 */
export function selectableStatuses(
  order: Pick<Order, "status" | "paymentMethod" | "paymentStatus" | "ghnOrderCode" | "shippingStatus">,
): string[] {
  if (order.status === "CANCELLED" || order.status === "DELIVERED") return [order.status];
  const current = stepIndex(order.status);
  const unpaidOnline = order.paymentMethod !== "COD" && order.paymentStatus !== "PAID";
  // Dang co van don GHN: "dang giao / da giao" do GHN bao, khong cho danh dau tay
  const viaGhn = hasActiveShipment(order);
  const forward = ORDER_STEPS.filter(
    (step, i) =>
      i >= current &&
      !(unpaidOnline && i > stepIndex("CONFIRMED") && i !== current) &&
      !(viaGhn && i !== current && (step === "SHIPPING" || step === "DELIVERED")),
  );
  const cancellable = ["PENDING", "CONFIRMED", "PREPARING"].includes(order.status);
  return cancellable ? [...forward, "CANCELLED"] : [...forward];
}
