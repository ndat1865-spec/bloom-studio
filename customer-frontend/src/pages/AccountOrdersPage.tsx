import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Check, CreditCard, MapPin, Truck, UserRound } from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { OrderStatusBadge } from "@/components/shop/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { Order } from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTIVE = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPING"];

type FilterKey = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";

const FILTERS: { key: FilterKey; label: string; match: (o: Order) => boolean }[] = [
  { key: "ALL", label: "Tất cả", match: () => true },
  { key: "ACTIVE", label: "Đang xử lý", match: (o) => ACTIVE.includes(o.status) },
  { key: "DELIVERED", label: "Đã giao", match: (o) => o.status === "DELIVERED" },
  { key: "CANCELLED", label: "Đã huỷ", match: (o) => o.status === "CANCELLED" },
];

/** Cac buoc cua don, dung cho thanh tien trinh nho o don dang xu ly. */
const STEPS = [
  { status: "PENDING", label: "Đã đặt" },
  { status: "CONFIRMED", label: "Xác nhận" },
  { status: "PREPARING", label: "Cắm hoa" },
  { status: "SHIPPING", label: "Đang giao" },
  { status: "DELIVERED", label: "Đã giao" },
];

const PAGE = 8;

function formatDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "Hom nay" theo gio Viet Nam, trung voi cach backend xet ngay giao. */
function todayVn(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** "hom nay" / "ngay mai" / "thu Sau 03/10" - de doc hon mot chuoi ngay. */
function describeDelivery(iso: string): string {
  const today = todayVn();
  const days = Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
  if (days < 0) return formatDay(iso);
  if (days === 0) return "hôm nay";
  if (days === 1) return "ngày mai";
  const weekday = new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long" });
  return `${weekday} ${formatDay(iso).slice(0, 5)}`;
}

/** Ten don: bo hoa dau tien, them "+ N mon khac" neu nhieu. */
function titleOf(order: Order): string {
  const first = order.items[0];
  if (!first) return `Đơn ${order.code}`;
  const more = order.items.length - 1;
  return more > 0 ? `${first.productName} + ${more} món khác` : first.productName;
}

/**
 * Tai khoan > Don hang cua toi. PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Lay tu GET /orders/my - chi don cua tai khoan dang dang nhap (id tu JWT).
 * Don dang xu ly hien kem thanh tien trinh va thong tin giao; don da xong gon hon.
 */
export default function AccountOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [shown, setShown] = useState(PAGE);

  const userId = user?.id;

  useEffect(() => {
    if (userId == null) return;
    const controller = new AbortController();

    setOrders(null);
    setError(null);

    api
      .listMyOrders(0, 50, controller.signal)
      .then((page) => setOrders(page.content))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Không tải được danh sách đơn hàng.");
      });

    return () => controller.abort();
  }, [userId, reloadKey]);

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = { ALL: 0, ACTIVE: 0, DELIVERED: 0, CANCELLED: 0 };
    for (const f of FILTERS) result[f.key] = orders?.filter(f.match).length ?? 0;
    return result;
  }, [orders]);

  // Don dang xu ly len dau (moi nhat truoc), roi den don da xong
  const visible = useMemo(() => {
    if (!orders) return [];
    const match = FILTERS.find((f) => f.key === filter)!.match;
    return orders
      .filter(match)
      .sort(
        (a, b) =>
          Number(ACTIVE.includes(b.status)) - Number(ACTIVE.includes(a.status)) ||
          Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
  }, [orders, filter]);

  if (!user) return null;

  return (
    <AccountLayout
      eyebrow="Lịch sử mua sắm"
      title="Đơn hàng của tôi"
      description="Theo dõi bó hoa đang được cắm và giao, xem lại những đơn đã đặt."
    >
      {error ? (
        <ErrorState
          message={error}
          action={
            <Button variant="outline" size="md" onClick={() => setReloadKey((key) => key + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : orders === null ? (
        <Spinner label="Đang tải đơn hàng…" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Chưa có đơn hàng nào"
          description="Khi bạn đặt hoa lúc đã đăng nhập, đơn sẽ được lưu vào đây để theo dõi."
          action={
            <Button variant="primary" size="lg" asChild>
              <Link to="/products">Xem danh mục hoa →</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div role="group" aria-label="Lọc đơn hàng" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(f.key);
                    setShown(PAGE);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.8125rem] transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-accent/60 hover:text-foreground",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "num min-w-5 rounded-full px-1.5 text-center text-[11px]",
                      f.key === "ACTIVE" && counts.ACTIVE > 0
                        ? "bg-accent text-background"
                        : "bg-surface-raised text-muted-foreground",
                    )}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <p className="mt-8 bg-surface px-6 py-10 text-center text-sm font-light text-muted-foreground">
              {filter === "ACTIVE"
                ? "Không có đơn nào đang xử lý. Đơn mới đặt sẽ hiện ở đây."
                : "Không có đơn nào trong mục này."}
            </p>
          ) : (
            <ul className="mt-8 space-y-4">
              {visible.slice(0, shown).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          )}

          {visible.length > shown ? (
            <div className="mt-8 flex justify-center">
              <Button variant="ghost" size="md" onClick={() => setShown((n) => n + PAGE)}>
                Xem thêm {Math.min(PAGE, visible.length - shown)} đơn
              </Button>
            </div>
          ) : null}
        </>
      )}
    </AccountLayout>
  );
}

function OrderCard({ order }: { order: Order }) {
  const active = ACTIVE.includes(order.status);
  const cancelled = order.status === "CANCELLED";
  const unpaidOnline =
    !cancelled && order.paymentMethod !== "COD" && order.paymentStatus === "UNPAID";
  const time = order.deliveryTimeLabel ?? order.timeSlotLabel;

  return (
    <li
      className={cn(
        "group relative bg-surface transition-colors hover:bg-surface-raised/40",
        active && "ring-1 ring-accent/35",
      )}
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
        <Thumbs order={order} dim={cancelled} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <OrderStatusBadge status={order.status} className="px-2.5 py-1.5" />
            <span className="num text-xs text-muted-foreground">
              Đặt {formatDay(order.createdAt)} · {order.code}
            </span>
          </div>

          <h2
            className={cn(
              "mt-3 font-display text-[1.35rem] font-semibold italic leading-snug",
              cancelled ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {/* Ca the bam duoc nho lop phu, chu khong long nhieu the <a> */}
            <Link
              to={`/orders/${order.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
            >
              {titleOf(order)}
            </Link>
          </h2>

          {/* Giao cho ai, luc nao */}
          {!cancelled ? (
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.8125rem] font-light text-muted-foreground">
              {order.deliveryDate ? (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Giao</dt>
                  <Truck className="size-3.5 text-accent" aria-hidden="true" />
                  <dd>
                    {order.status === "DELIVERED" ? "Đã giao " : "Giao "}
                    <span className="text-foreground">
                      {order.status === "DELIVERED" && order.deliveredAt
                        ? formatDay(order.deliveredAt)
                        : describeDelivery(order.deliveryDate)}
                    </span>
                    {time && order.status !== "DELIVERED" ? <span className="num"> · {time}</span> : null}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Người nhận</dt>
                <UserRound className="size-3.5 text-accent" aria-hidden="true" />
                <dd className="text-foreground">{order.customerName}</dd>
              </div>
              <div className="flex min-w-0 max-w-full items-center gap-1.5">
                <dt className="sr-only">Địa chỉ</dt>
                <MapPin className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                <dd className="truncate">{order.address}</dd>
              </div>
            </dl>
          ) : null}

          {active ? <MiniProgress order={order} /> : null}

          {order.arrangementPhotoUrl && !cancelled ? (
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-accent">
              <Camera className="size-3.5" aria-hidden="true" />
              Studio đã gửi ảnh bó hoa thật — xem trong chi tiết đơn
            </p>
          ) : null}
        </div>

        {/* Tien + thanh toan */}
        <div className="flex shrink-0 flex-row items-end justify-between gap-4 sm:w-44 sm:flex-col sm:items-end sm:justify-start sm:text-right">
          <div>
            <p className="label-micro text-muted-foreground">Tổng cộng</p>
            <p
              className={cn(
                "num mt-1 font-display text-2xl font-semibold italic",
                cancelled ? "text-muted-foreground line-through decoration-1" : "text-accent",
              )}
            >
              {formatPrice(order.total)}
            </p>
          </div>
          <p
            className={cn(
              "text-xs sm:mt-2",
              unpaidOnline ? "text-danger" : order.paymentStatus === "PAID" ? "text-success" : "text-muted-foreground",
            )}
          >
            {order.paymentStatus === "PAID" ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                Đã thanh toán
              </span>
            ) : unpaidOnline ? (
              <span className="inline-flex items-center gap-1">
                <CreditCard className="size-3.5" aria-hidden="true" />
                Chưa thanh toán {order.paymentMethodLabel}
              </span>
            ) : (
              order.paymentMethodLabel
            )}
          </p>
        </div>
      </div>
    </li>
  );
}

/** Anh mon dau tien cua don, kem so mon con lai; don huy thi mo di. */
function Thumbs({ order, dim }: { order: Order; dim: boolean }) {
  const first = order.items[0];
  const more = order.items.length - 1;
  return (
    <div className={cn("relative size-24 shrink-0 sm:size-28", dim && "opacity-45 grayscale")} aria-hidden="true">
      <img
        src={resolveImageUrl(first?.imageUrl)}
        alt=""
        onError={(event) => {
          const img = event.currentTarget;
          if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
        }}
        className="size-full bg-surface-raised object-cover"
      />
      {more > 0 ? (
        <span className="num absolute bottom-1.5 right-1.5 bg-background/85 px-1.5 py-0.5 text-[11px] text-foreground backdrop-blur-sm">
          +{more}
        </span>
      ) : null}
    </div>
  );
}

/** Thanh 5 buoc nho: Da dat -> Xac nhan -> Cam hoa -> Dang giao -> Da giao. */
function MiniProgress({ order }: { order: Order }) {
  const current = STEPS.findIndex((s) => s.status === order.status);
  const label = order.status === "SHIPPING" && order.shippingStatusLabel ? order.shippingStatusLabel : null;
  return (
    <div className="mt-5">
      <ol className="grid grid-cols-5 gap-1.5" aria-label="Tiến độ đơn hàng">
        {STEPS.map((step, index) => (
          <li key={step.status} className="min-w-0">
            <span
              aria-hidden="true"
              className={cn(
                "block h-1 rounded-full",
                index < current ? "bg-accent" : index === current ? "bg-accent/60" : "bg-border-strong/40",
                index === current && "motion-safe:animate-pulse",
              )}
            />
            <span
              className={cn(
                "mt-1.5 block truncate text-[11px]",
                index <= current ? "text-foreground" : "text-muted-foreground/70",
                index === current && "font-medium text-accent",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
      {label ? <p className="mt-2 text-xs text-muted-foreground">Giao Hàng Nhanh: {label}</p> : null}
    </div>
  );
}
