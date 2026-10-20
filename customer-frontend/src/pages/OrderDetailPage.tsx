import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Copy, Gift, MapPin, NotebookPen, Phone, Truck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { OrderStatusBadge } from "@/components/shop/OrderStatusBadge";
import { CheckoutSteps } from "@/components/shop/CheckoutSteps";
import { OrderTracking } from "@/components/shop/OrderTracking";
import { OrderPaymentPanel } from "@/components/shop/OrderPaymentPanel";
import { CancelOrderButton } from "@/components/shop/CancelOrderButton";
import { ApiError, api, type Order } from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Xac nhan / chi tiet don hang — PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Du lieu doc tu GET /orders/{id}, KHONG lay tu state dieu huong, nen tai lai trang (F5)
 * van hien dung don.
 *
 * Bo cuc: tieu de noi bang loi don dang o dau; theo doi don ngang toan trang; ben duoi
 * hai cot — trai la bo hoa + noi giao (thiep trinh bay nhu mot tam thiep that), phai la
 * tien + thanh toan, bam theo khi cuon.
 */

const MONTHS = [
  "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
  "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12",
];

/** "22:27 · 13 tháng 9, 2026" */
function formatPlacedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} · ${date.getDate()} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

/** "Hom nay" theo gio Viet Nam, trung voi cach backend xet ngay giao. */
function todayVn(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** "hôm nay" / "ngày mai" / "thứ Sáu, 3 tháng 10" */
function describeDay(iso: string | null): string {
  if (!iso) return "sớm nhất có thể";
  const days = Math.round((Date.parse(iso) - Date.parse(todayVn())) / 86_400_000);
  if (days === 0) return "hôm nay";
  if (days === 1) return "ngày mai";
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("vi-VN", { weekday: "long" });
  return `${weekday}, ${day} ${MONTHS[month - 1]}`;
}

/** Tieu de trang theo trang thai don — noi bang loi, khong bat khach doc ma. */
function headlineOf(order: Order): string {
  switch (order.status) {
    case "PENDING":
      return "Studio đang xác nhận đơn";
    case "CONFIRMED":
      return "Studio đã nhận đơn của bạn";
    case "PREPARING":
      return "Thợ hoa đang cắm bó hoa";
    case "SHIPPING":
      return "Hoa đang trên đường giao";
    case "DELIVERED":
      return `Hoa đã tới tay ${order.customerName}`;
    case "CANCELLED":
      return "Đơn đã huỷ";
    default:
      return "Chi tiết đơn";
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  /**
   * Cung mot trang phuc vu HAI ngu canh:
   *  - Vua dat xong  -> loi cam on + thanh buoc "Hoan tat"
   *  - Xem lai tu Don hang cua toi -> chi tiet don binh thuong, co duong lui
   * Co justPlaced chi ton tai trong lan dieu huong ngay sau khi dat.
   */
  const navState = location.state as { justPlaced?: boolean; paymentError?: string } | null;
  const justPlaced = navState?.justPlaced === true;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setError("Mã đơn hàng không hợp lệ.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .getOrder(numericId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setOrder(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "Không tìm thấy đơn hàng này."
            : err instanceof Error
              ? err.message
              : "Không tải được đơn hàng.",
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (loading) {
    return (
      <div className="shell page-pad">
        <div className="space-y-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-14 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="shell page-pad">
        <ErrorState
          message={error ?? "Không tải được đơn hàng."}
          action={
            <Button variant="outline" size="md" asChild>
              <Link to="/products">Về danh mục hoa</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const cancelled = order.status === "CANCELLED";
  const time = order.deliveryTimeLabel ?? order.timeSlotLabel;
  const hasCard = order.cardType && order.cardType !== "NONE";

  async function copyCode() {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.code);
      setCopied(true);
    } catch {
      // Trinh duyet chan clipboard: ma van hien ro tren trang
    }
  }

  return (
    <div className="shell page-pad">
      {/* ---------- Dau trang ---------- */}
      <header>
        {justPlaced ? (
          <p className="label-micro flex items-center gap-2 text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Đã nhận đơn hàng
          </p>
        ) : (
          <Link
            to="/tai-khoan/don-hang"
            className="label-micro inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-accent"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Đơn hàng của tôi
          </Link>
        )}

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="min-w-0">
            <h1 className="display-section text-foreground">{justPlaced ? "Cảm ơn bạn" : headlineOf(order)}</h1>
            <p className="mt-4 text-[1.0625rem] font-light leading-relaxed text-muted-foreground">
              {justPlaced ? (
                order.paymentMethod !== "COD" && order.paymentStatus === "UNPAID" ? (
                  "Đơn đã được tạo nhưng chưa thanh toán — thanh toán ở khung bên phải để studio bắt đầu chuẩn bị hoa."
                ) : (
                  "Studio đã nhận đơn và sẽ gọi số bạn để lại nếu cần xác nhận thêm."
                )
              ) : cancelled ? (
                "Đơn này không còn được giao."
              ) : (
                <>
                  {order.status === "DELIVERED" ? "Đã giao " : "Giao "}
                  <span className="text-foreground">{describeDay(order.deliveryDate)}</span>
                  {time && order.status !== "DELIVERED" ? <span className="num"> · {time}</span> : null} tới{" "}
                  <span className="text-foreground">{order.customerName}</span>.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <button
              type="button"
              onClick={() => void copyCode()}
              className="num inline-flex items-center gap-2 border border-border px-3 py-2 text-xs tracking-wider text-muted-foreground transition-colors hover:border-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              title="Chép mã đơn"
            >
              {order.code}
              {copied ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              <span className="sr-only">{copied ? "Đã chép mã đơn" : "Chép mã đơn"}</span>
            </button>
          </div>
        </div>
        <span aria-hidden="true" className="mt-8 block h-px w-full bg-border" />
      </header>

      {justPlaced ? (
        <div className="mt-10">
          <CheckoutSteps current={2} />
        </div>
      ) : null}

      <OrderTracking order={order} />

      {/* ---------- Hai cot: bo hoa + noi giao | tien + thanh toan ---------- */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <div className="min-w-0 space-y-8">
          {/* Bo hoa trong don */}
          <section aria-labelledby="order-items-heading" className="bg-surface p-6 sm:p-8">
            <h2 id="order-items-heading" className="font-display text-2xl font-semibold italic text-foreground">
              Bó hoa trong đơn
            </h2>
            <ul className="mt-6 divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-5 py-5 first:pt-0">
                  <img
                    src={resolveImageUrl(item.imageUrl)}
                    alt=""
                    onError={(event) => {
                      const img = event.currentTarget;
                      if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                    }}
                    className={cn("size-20 shrink-0 bg-surface-raised object-cover sm:size-24", cancelled && "grayscale")}
                  />
                  <div className="min-w-0 flex-1">
                    {item.productId != null ? (
                      <Link
                        to={`/products/${item.productId}`}
                        className="font-display text-lg font-semibold italic text-foreground transition-colors hover:text-accent sm:text-xl"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <p className="font-display text-lg font-semibold italic text-foreground sm:text-xl">
                        {item.productName}
                      </p>
                    )}
                    {item.sizeLabel ? (
                      <p className="mt-1.5">
                        <span className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground/90">
                          {item.customRequestId != null ? item.sizeLabel : `Cỡ ${item.sizeLabel}`}
                        </span>
                      </p>
                    ) : null}
                    <p className="num mt-1.5 text-sm text-muted-foreground">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="num shrink-0 text-right text-base text-foreground">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
              {order.addons.map((addon) => (
                <li key={addon.code} className="flex items-center gap-4 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Gift className="size-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {addon.name}
                      <span className="num text-muted-foreground">
                        {" "}
                        · {formatPrice(addon.unitPrice)} × {addon.quantity}
                      </span>
                    </p>
                    <p className="label-micro mt-1 text-accent">Quà kèm</p>
                  </div>
                  <p className="num shrink-0 text-right text-sm text-foreground">{formatPrice(addon.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Giao toi dau, cho ai */}
          <section aria-labelledby="delivery-heading" className="bg-surface p-6 sm:p-8">
            <h2 id="delivery-heading" className="font-display text-2xl font-semibold italic text-foreground">
              Giao tới
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoBlock icon={UserRound} label="Người nhận">
                <p className="text-foreground">{order.customerName}</p>
                <a
                  href={`tel:${order.phone}`}
                  className="num mt-1 inline-flex items-center gap-1.5 text-muted-foreground hover:text-accent"
                >
                  <Phone className="size-3.5" aria-hidden="true" />
                  {order.phone}
                </a>
              </InfoBlock>
              <InfoBlock icon={Truck} label="Thời gian giao">
                <p className="text-foreground first-letter:uppercase">{describeDay(order.deliveryDate)}</p>
                <p className="num mt-1 text-muted-foreground">{time ?? "Trong ngày"}</p>
              </InfoBlock>
              <InfoBlock icon={MapPin} label="Địa chỉ" className="sm:col-span-2">
                <p className="text-foreground">{order.address}</p>
              </InfoBlock>
              {order.senderName ? (
                <InfoBlock icon={Gift} label="Người tặng" className="sm:col-span-2">
                  <p className="text-foreground">
                    {order.senderName}
                    {order.senderPhone ? <span className="num text-muted-foreground"> · {order.senderPhone}</span> : null}
                  </p>
                  {order.anonymousSender ? (
                    <p className="mt-1 text-xs text-muted-foreground">Giấu tên với người nhận</p>
                  ) : null}
                </InfoBlock>
              ) : null}
              {order.note ? (
                <InfoBlock icon={NotebookPen} label="Ghi chú cho người giao" className="sm:col-span-2">
                  <p className="text-foreground">{order.note}</p>
                </InfoBlock>
              ) : null}
            </div>

            {/*
              Thiep: trinh bay nhu mot tam thiep giay that — diem nhan duy nhat cua trang,
              vi day la loi nguoi dat gui gam.
            */}
            {hasCard ? (
              <figure className="mt-8 max-w-md -rotate-1 bg-foreground px-7 py-6 text-background shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                <p className="label-micro text-background/60">{order.cardTypeLabel}</p>
                <blockquote className="mt-3 font-display text-xl italic leading-snug">
                  {order.cardMessage ? `“${order.cardMessage}”` : "Không kèm lời chúc"}
                </blockquote>
                <figcaption className="mt-4 text-right text-sm italic text-background/70">
                  — {order.senderName && !order.anonymousSender ? order.senderName : "Một người thương"}
                </figcaption>
              </figure>
            ) : null}
          </section>
        </div>

        {/* ---------- Cot phai: tien + thanh toan ---------- */}
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <section aria-labelledby="summary-heading" className="bg-surface p-6">
            <h2 id="summary-heading" className="label-micro text-muted-foreground">
              Tổng đơn
            </h2>
            <p
              className={cn(
                "num mt-3 font-display text-[2.4rem] font-semibold italic leading-none",
                cancelled ? "text-muted-foreground line-through decoration-1" : "text-accent",
              )}
            >
              {formatPrice(order.total)}
            </p>
            <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tiền hoa</dt>
                <dd className="num text-foreground">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.extrasTotal > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Thiệp & quà kèm</dt>
                  <dd className="num text-foreground">{formatPrice(order.extrasTotal)}</dd>
                </div>
              ) : null}
              {order.discount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Giảm giá ({order.voucherCode})</dt>
                  <dd className="num text-success">−{formatPrice(order.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Phí giao hàng</dt>
                <dd className="num text-foreground">
                  {order.deliveryFee === 0 ? "Miễn phí" : formatPrice(order.deliveryFee)}
                </dd>
              </div>
            </dl>
            <p className="num mt-5 text-xs font-light text-muted-foreground">Đặt lúc {formatPlacedAt(order.createdAt)}</p>
          </section>

          <OrderPaymentPanel order={order} onOrderChange={setOrder} initialError={navState?.paymentError} />

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" size="lg" asChild className="w-full">
              <Link to="/products">Tiếp tục mua hoa →</Link>
            </Button>
            {!justPlaced ? (
              <Button variant="ghost" size="lg" asChild className="w-full">
                <Link to="/tai-khoan/don-hang">Tất cả đơn hàng</Link>
              </Button>
            ) : null}
            <CancelOrderButton order={order} onCancelled={setOrder} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex gap-3.5 text-sm", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
      <div className="min-w-0">
        <p className="label-micro mb-1.5 text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}
