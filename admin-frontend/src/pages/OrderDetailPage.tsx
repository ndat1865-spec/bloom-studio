import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  CreditCard,
  Flower2,
  Gift,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  PackageCheck,
  Phone,
  RefreshCw,
  TicketPercent,
  Truck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, NativeSelect } from "@/components/ui/field";
import { ErrorState, Notice, Skeleton } from "@/components/ui/feedback";
import {
  ORDER_STATUS_LABELS,
  ORDER_STEPS,
  OrderStatusBadge,
  selectableStatuses,
  hasActiveShipment,
  beforePickup,
  stepIndex,
  type OrderStep,
} from "@/components/shop/OrderStatusBadge";
import { ApiError, api, type Order, type Payment } from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Chi tiet don hang cho quan tri — mo tu trang Don hang.
 *
 * Du lieu doc tu GET /api/orders/{id} (ADMIN / nhan vien xem duoc moi don), KHONG lay tu
 * state dieu huong, nen tai lai trang (F5) van hien dung don.
 *
 * Bo cuc: tren cung la thanh tien trinh 5 buoc; trai la hang trong don va van chuyen
 * (can cho rong cho hanh trinh GHN); phai la khoi xu ly don, thanh toan, nguoi nhan.
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

/** "25 tháng 9, 2026" */
function formatDeliveryDate(value: string | null): string {
  if (!value) return "Sớm nhất có thể";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${day} ${MONTHS[month - 1]}, ${year}`;
}

/** "14:05 · 27/9/2026" */
function formatShort(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} · ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

/** 7200 -> "7,2 kg"; 800 -> "800 g" */
function formatWeight(grams: number | null): string {
  if (!grams) return "—";
  if (grams < 1000) return `${grams} g`;
  return `${(grams / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} kg`;
}

const PAYMENT_TONE: Record<string, string> = {
  PAID: "bg-success/12 text-success",
  SUCCESS: "bg-success/12 text-success",
  UNPAID: "bg-surface-raised text-muted-foreground",
  PENDING: "bg-warning/12 text-warning",
  FAILED: "bg-danger/12 text-danger",
  REFUND_PENDING: "bg-danger/12 text-danger",
  REFUNDING: "bg-warning/12 text-warning",
  REFUNDED: "bg-info/12 text-info",
};

const TXN_LABEL: Record<Payment["status"], string> = {
  PENDING: "Đang chờ",
  SUCCESS: "Thành công",
  FAILED: "Thất bại",
  REFUNDING: "Đang hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
};

/** Icon + moc thoi gian cua tung buoc tien trinh. */
const STEP_META: Record<OrderStep, { icon: typeof Clock; at: (o: Order) => string | null }> = {
  PENDING: { icon: Clock, at: (o) => o.createdAt },
  CONFIRMED: { icon: ClipboardCheck, at: (o) => o.confirmedAt },
  PREPARING: { icon: Flower2, at: (o) => o.preparingAt },
  SHIPPING: { icon: Truck, at: (o) => o.shippingAt },
  DELIVERED: { icon: PackageCheck, at: (o) => o.deliveredAt },
};

/** Viec can lam o buoc tiep theo - hien ngay duoi nut chuyen buoc. */
const NEXT_HINT: Record<OrderStep, string> = {
  PENDING: "",
  CONFIRMED: "Xác nhận đã nhận đơn và sẽ bó hoa theo lịch giao.",
  PREPARING: "Bắt đầu bó hoa, đóng gói. Tạo vận đơn GHN cũng tự chuyển sang bước này.",
  SHIPPING: "Hoa đã rời cửa hàng. Có vận đơn GHN thì bước này tự cập nhật khi shipper lấy hàng.",
  DELIVERED: "Người nhận đã nhận hoa. Đơn COD sẽ được ghi nhận là đã thu tiền.",
};

/** "Hom nay" theo gio Viet Nam, trung voi cach backend xet ngay giao. */
function todayVn(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Do gap cua don: con bao lau toi ngay giao. Don da giao / da huy thi chi ghi ngay.
 * Mau: qua han / hom nay = do / vang, ngay mai = xanh, con lai = xam.
 */
function deliveryUrgency(order: Order): { day: string; tone: string; note: string | null } {
  if (!order.deliveryDate) return { day: "Sớm nhất có thể", tone: "text-foreground", note: null };
  const days = Math.round((Date.parse(order.deliveryDate) - Date.parse(todayVn())) / 86_400_000);
  const [, m, d] = order.deliveryDate.split("-");
  const short = `${d}/${m}`;
  const open = order.status !== "DELIVERED" && order.status !== "CANCELLED";
  if (!open) return { day: formatDeliveryDate(order.deliveryDate), tone: "text-foreground", note: null };
  if (days < 0) return { day: `Quá hạn · ${short}`, tone: "text-danger", note: `trễ ${-days} ngày` };
  if (days === 0) return { day: `Hôm nay · ${short}`, tone: "text-warning", note: null };
  if (days === 1) return { day: `Ngày mai · ${short}`, tone: "text-info", note: null };
  return { day: formatDeliveryDate(order.deliveryDate), tone: "text-foreground", note: `còn ${days} ngày` };
}

/** Nhom trang thai GHN -> mau: cho lay, dang di, xong, co van de. */
function shippingTone(status: string | null): string {
  switch (status) {
    case "ready_to_pick":
    case "picking":
    case "money_collect_picking":
      return "bg-warning/12 text-warning";
    case "delivered":
      return "bg-success/12 text-success";
    case "picked":
    case "storing":
    case "transporting":
    case "sorting":
    case "delivering":
    case "money_collect_delivering":
      return "bg-info/12 text-info";
    default:
      return "bg-danger/12 text-danger";
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  // Moi truong thu GHN: khong co shipper that -> hien cong cu gia lap
  const [ghnSandbox, setGhnSandbox] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api
      .getOrderOptions(controller.signal)
      .then((o) => setGhnSandbox(Boolean(o.ghnSandbox)))
      .catch(() => setGhnSandbox(false));
    return () => controller.abort();
  }, []);
  const [busy, setBusy] = useState<string | null>(null);
  // "code" / "card" vua duoc chep - hien dau tick trong 1,6 giay
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      // Trinh duyet chan clipboard: noi dung van hien ro tren trang
    }
  }

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

  // Lich su giao dich o payment-service - hong thi van xem duoc don
  useEffect(() => {
    if (!order) return;
    const controller = new AbortController();
    api
      .listOrderPayments(order.id, controller.signal)
      .then(setPayments)
      .catch(() => setPayments([]));
    return () => controller.abort();
  }, [order?.id, order?.paymentStatus]);

  /** Chay mot thao tac (tao van don, hoi GHN, hoi cong thanh toan) roi doc lai don. */
  async function run(key: string, action: () => Promise<unknown>, success: string) {
    if (!order) return;
    setBusy(key);
    setNotice(null);
    try {
      await action();
      setOrder(await api.getOrder(order.id));
      setPayments(await api.listOrderPayments(order.id).catch(() => payments));
      setNotice({ tone: "success", text: success });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Thao tác không thành công." });
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(status: string) {
    if (!order || status === order.status) return;
    if (
      status === "CANCELLED" &&
      !window.confirm(`Huỷ đơn ${order.code}? Tồn kho và lượt dùng mã giảm giá sẽ được hoàn lại, không mở lại được.`)
    ) {
      return;
    }
    setUpdating(true);
    setNotice(null);
    try {
      await api.updateOrderStatus(order.id, status);
      // Doc lai tu backend thay vi tu gan status — hien dung cai da luu that
      setOrder(await api.getOrder(order.id));
      setNotice({
        tone: "success",
        text: `Đã chuyển sang "${ORDER_STATUS_LABELS[status]?.label ?? status}".`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Không cập nhật được trạng thái.",
      });
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="shell page-pad">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-8 w-64" />
        <Skeleton className="mt-6 h-24 w-full" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
              <Link to="/admin/orders">Về danh sách đơn</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="shell page-pad">
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Tất cả đơn hàng
      </Link>

      <header className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="num text-2xl tracking-wide text-foreground">
            <span className="sr-only">Đơn hàng </span>
            {order.code}
          </h1>
          <button
            type="button"
            onClick={() => void copy("code", order.code)}
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            title="Chép mã đơn"
          >
            {copied === "code" ? (
              <Check className="size-4 text-success" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">{copied === "code" ? "Đã chép mã đơn" : "Chép mã đơn"}</span>
          </button>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="num text-sm text-muted-foreground">Đặt lúc {formatPlacedAt(order.createdAt)}</p>
      </header>

      <WorkBrief order={order} />

      {notice ? (
        <Notice tone={notice.tone} className="mt-5">
          {notice.text}
        </Notice>
      ) : null}

      <OrderProgress order={order} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <ItemsCard order={order} />
          <ArrangementPhotoCard
            order={order}
            busy={busy === "photo"}
            onUpload={(file) =>
              void run(
                "photo",
                () => api.uploadArrangementPhoto(order.id, file),
                "Đã gửi ảnh bó hoa cho khách (trang đơn + email). Đơn chuyển sang Đang cắm hoa.",
              )
            }
          />
          <ShippingCard
            order={order}
            busy={busy}
            onRefresh={() =>
              void run("ship-refresh", () => api.refreshShipment(order.id), "Đã cập nhật hành trình từ GHN.")
            }
            onCreate={() =>
              void run(
                "ship-create",
                () => api.createShipment(order.id),
                "Đã tạo vận đơn GHN, đơn chuyển sang Đang cắm hoa.",
              )
            }
            sandbox={ghnSandbox}
            onSimulate={(status, label) =>
              void run(`ship-sim`, () => api.simulateShipment(order.id, status), `Đã giả lập: ${label}.`)
            }
            onCancel={() => {
              if (!window.confirm(`Huỷ vận đơn GHN ${order.ghnOrderCode}? GHN sẽ không tới lấy hàng nữa, studio tự giao đơn này.`)) {
                return;
              }
              void run(
                "ship-cancel",
                () => api.cancelShipment(order.id),
                "Đã huỷ vận đơn GHN. Studio tự giao: cập nhật trạng thái ở khối Xử lý đơn.",
              );
            }}
          />
        </div>

        <div className="space-y-4">
          <ProcessCard order={order} updating={updating} onChange={(s) => void changeStatus(s)} />

          {/* ---------- Thanh toan ---------- */}
          <section aria-labelledby="payment-heading" className="card p-5">
            <h2 id="payment-heading" className="flex items-center gap-2 text-base text-foreground">
              <CreditCard className="size-4 text-accent" aria-hidden="true" />
              Thanh toán
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-foreground">
              {order.paymentMethodLabel}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_TONE[order.paymentStatus] ?? ""}`}
              >
                {order.paymentStatusLabel}
              </span>
            </div>
            {order.paidAt ? (
              <p className="num mt-1.5 text-xs text-subtle-foreground">Lúc {formatShort(order.paidAt)}</p>
            ) : null}
            {order.paymentStatus === "REFUND_PENDING" ? (
              <p className="mt-2 text-xs text-danger">
                Đơn đã huỷ sau khi khách trả tiền — bấm &ldquo;Hoàn tiền&rdquo; ở giao dịch bên dưới để hoàn{" "}
                {formatPrice(order.total)} qua cổng thanh toán.
              </p>
            ) : null}

            {payments.length > 0 ? (
              <ul className="mt-4 space-y-2.5 border-t border-border pt-4">
                {payments.map((p) => (
                  <li key={p.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground">
                        {p.providerLabel} · <span className="num">{formatPrice(p.amount)}</span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${PAYMENT_TONE[p.status] ?? ""}`}>
                        {TXN_LABEL[p.status]}
                      </span>
                    </div>
                    <p className="num mt-0.5 text-subtle-foreground">
                      {p.txnRef}
                      {p.providerTxnId ? ` · GD ${p.providerTxnId}` : ""} · {formatShort(p.createdAt)}
                    </p>
                    {p.message ? <p className="mt-0.5 text-subtle-foreground">{p.message}</p> : null}
                    {p.refundRequired && p.status === "SUCCESS" ? (
                      <p className="mt-0.5 font-medium text-danger">Cần hoàn tiền</p>
                    ) : null}
                    {p.refundedAt ? (
                      <p className="num mt-0.5 text-subtle-foreground">
                        Hoàn lúc {formatShort(p.refundedAt)}
                        {p.refundTxnId ? ` · mã ${p.refundTxnId}` : ""}
                      </p>
                    ) : null}
                    {p.status === "SUCCESS" && (p.refundRequired || order.paymentStatus === "REFUND_PENDING") ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Hoàn ${formatPrice(p.amount)} qua ${p.providerLabel}? Không thu hồi lại được.`)) return;
                          void run(`refund-${p.id}`, () => api.refundPayment(p.id), "Đã gửi yêu cầu hoàn tiền tới cổng thanh toán.");
                        }}
                        disabled={busy !== null}
                        className="mt-1 mr-3 inline-flex items-center gap-1 font-medium text-danger hover:underline disabled:opacity-50"
                      >
                        {busy === `refund-${p.id}` ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
                        Hoàn tiền
                      </button>
                    ) : null}
                    {p.status === "PENDING" || p.status === "REFUNDING" ? (
                      <button
                        type="button"
                        onClick={() =>
                          void run(`pay-${p.id}`, () => api.refreshPayment(p.id), "Đã hỏi lại cổng thanh toán.")
                        }
                        disabled={busy !== null}
                        className="mt-1 inline-flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
                      >
                        <RefreshCw className="size-3" aria-hidden="true" />
                        Hỏi lại cổng thanh toán
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* ---------- Nguoi nhan + giao hang ---------- */}
          <section aria-labelledby="delivery-info-heading" className="card p-5">
            <h2 id="delivery-info-heading" className="text-base text-foreground">
              Giao hàng
            </h2>
            <dl className="mt-4 space-y-3.5">
              <InfoRow icon={User} label="Người nhận">
                {order.customerName}
                {/* Don qua tang: tai khoan dat hang la cua NGUOI TANG, hien o khoi Qua tang */}
                {order.senderName ? null : (
                  <span className="block text-xs text-subtle-foreground">
                    {order.username ? `Tài khoản @${order.username}` : "Khách vãng lai"}
                  </span>
                )}
              </InfoRow>
              <InfoRow icon={Phone} label="Điện thoại">
                <span className="num">{order.phone}</span>
              </InfoRow>
              <InfoRow icon={CalendarClock} label="Ngày giao">
                {formatDeliveryDate(order.deliveryDate)}
                {order.deliveryTimeLabel || order.timeSlotLabel ? (
                  <span className="block text-xs text-subtle-foreground">
                    {order.deliveryTimeLabel ? `Khung ${order.deliveryTimeLabel}` : order.timeSlotLabel}
                  </span>
                ) : null}
              </InfoRow>
              <InfoRow icon={MapPin} label="Địa chỉ">
                {order.address}
              </InfoRow>
            </dl>
            {order.note ? (
              <div className="mt-4 flex gap-2.5 rounded-[var(--radius-sm)] bg-warning/10 px-3.5 py-3 text-sm ring-1 ring-inset ring-warning/25">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-warning">Khách dặn người giao</p>
                  <p className="mt-0.5 text-foreground">{order.note}</p>
                </div>
              </div>
            ) : null}
          </section>

          {/* ---------- Qua tang: nguoi tang + thiep ---------- */}
          {order.senderName || (order.cardType && order.cardType !== "NONE") ? (
            <section aria-labelledby="gift-heading" className="card p-5">
              <h2 id="gift-heading" className="flex items-center gap-2 text-base text-foreground">
                <Gift className="size-4 text-accent" aria-hidden="true" />
                Quà tặng
              </h2>
              <dl className="mt-4 space-y-3.5">
                {order.senderName ? (
                  <InfoRow icon={User} label="Người tặng">
                    {order.senderName}
                    <span className="num block text-xs text-subtle-foreground">
                      {[order.senderPhone, order.username ? `Tài khoản @${order.username}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {order.anonymousSender ? (
                      <span className="mt-1 inline-flex rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning">
                        Giấu tên với người nhận
                      </span>
                    ) : null}
                  </InfoRow>
                ) : null}
              </dl>
              {order.cardType && order.cardType !== "NONE" ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="size-3.5" aria-hidden="true" />
                      {order.cardTypeLabel} — nội dung cần in
                    </p>
                    {order.cardMessage ? (
                      <button
                        type="button"
                        onClick={() => void copy("card", order.cardMessage ?? "")}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        {copied === "card" ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
                        {copied === "card" ? "Đã chép" : "Chép"}
                      </button>
                    ) : null}
                  </div>
                  {/* Trinh bay nhu tam thiep that de nhan vien hinh dung ban in */}
                  <figure className="mt-2.5 rounded-[3px] bg-foreground px-5 py-4 text-background shadow-[var(--shadow-pop)]">
                    <blockquote className="font-display text-lg italic leading-snug">
                      {order.cardMessage ? `“${order.cardMessage}”` : "Không kèm lời chúc — để thiệp trống"}
                    </blockquote>
                    <figcaption className="mt-2.5 text-right text-xs italic text-background/65">
                      — {order.senderName && !order.anonymousSender ? order.senderName : "Không ký tên"}
                    </figcaption>
                  </figure>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */

/**
 * Dai "phieu viec" ngay duoi tieu de: bon dieu nhan vien can biet truoc tien — giao luc
 * nao (to mau theo do gap), cho ai, da thu tien chua, tong bao nhieu.
 */
function WorkBrief({ order }: { order: Order }) {
  const urgency = deliveryUrgency(order);
  const time = order.deliveryTimeLabel ?? order.timeSlotLabel;
  return (
    <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface lg:grid-cols-4">
      <BriefCell icon={CalendarClock} label="Giao">
        <span className={cn("font-medium", urgency.tone)}>{urgency.day}</span>
        <span className="num block text-xs text-muted-foreground">
          {[time ?? "Trong ngày", urgency.note].filter(Boolean).join(" · ")}
        </span>
      </BriefCell>
      <BriefCell icon={User} label="Người nhận">
        <span className="block truncate font-medium text-foreground">{order.customerName}</span>
        <a href={`tel:${order.phone}`} className="num block text-xs text-muted-foreground hover:text-accent">
          {order.phone}
        </a>
      </BriefCell>
      <BriefCell icon={CreditCard} label="Thanh toán">
        <span className="block truncate text-foreground">{order.paymentMethodLabel}</span>
        <span
          className={cn(
            "mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            PAYMENT_TONE[order.paymentStatus] ?? "",
          )}
        >
          {order.paymentStatusLabel}
        </span>
      </BriefCell>
      <BriefCell icon={Flower2} label="Tổng đơn">
        <span className={cn("num text-xl font-semibold", order.status === "CANCELLED" ? "text-muted-foreground line-through" : "text-accent")}>
          {formatPrice(order.total)}
        </span>
        <span className="block text-xs text-muted-foreground">
          {order.items.reduce((n, i) => n + i.quantity, 0)} bó hoa
          {order.addons.length ? ` · ${order.addons.length} quà kèm` : ""}
        </span>
      </BriefCell>
    </dl>
  );
}

function BriefCell({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-border px-5 py-4 [&:nth-child(n+3)]:border-t lg:[&:nth-child(n+3)]:border-t-0 [&:not(:first-child)]:border-l [&:nth-child(3)]:border-l-0 lg:[&:nth-child(3)]:border-l">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 text-accent" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1.5 text-sm">{children}</dd>
    </div>
  );
}

/** Thanh tien trinh 5 buoc. Don huy thi thay bang mot dai bao huy. */
function OrderProgress({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return (
      <section
        aria-label="Tiến trình đơn"
        className="mt-6 flex items-center gap-3 rounded-[var(--radius-md)] border border-danger/30 bg-danger/8 px-5 py-4"
      >
        <Ban className="size-5 shrink-0 text-danger" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">Đơn đã huỷ</p>
          <p className="num text-xs text-muted-foreground">
            {order.cancelledAt ? `Lúc ${formatShort(order.cancelledAt)} · ` : ""}Tồn kho và lượt dùng mã giảm giá
            đã được hoàn lại.
          </p>
        </div>
      </section>
    );
  }

  const current = stepIndex(order.status);
  return (
    <section aria-label="Tiến trình đơn" className="card mt-6 px-5 py-5">
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-0">
        {ORDER_STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const Icon = done ? Check : STEP_META[step].icon;
          const at = STEP_META[step].at(order);
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className="relative flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
            >
              {/* Duong noi sang buoc sau */}
              {i < ORDER_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-5 left-[calc(50%+1.5rem)] hidden h-px w-[calc(100%-3rem)] sm:block",
                    i < current ? "bg-accent" : "bg-border-strong",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                  done && "border-accent bg-accent text-background",
                  active && "border-accent bg-accent-soft text-accent ring-4 ring-accent/15",
                  !done && !active && "border-border-strong bg-surface text-subtle-foreground",
                )}
              >
                <Icon className="size-[1.1rem]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[0.8125rem]",
                    active ? "font-medium text-foreground" : done ? "text-foreground" : "text-subtle-foreground",
                  )}
                >
                  {ORDER_STATUS_LABELS[step].label}
                </span>
                <span className="num block text-xs text-subtle-foreground">
                  {done || active ? (at ? formatShort(at) : "—") : " "}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Hang trong don: the san pham anh lon, qua kem, roi bang tien. */
/**
 * Anh bo hoa thanh pham: tho cam xong thi chup va tai len, khach thay ngay o trang don
 * va nhan email kem anh. Tai lai thi thay anh cu (vd. khach nho sua).
 */
function ArrangementPhotoCard({
  order,
  busy,
  onUpload,
}: {
  order: Order;
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const closed = order.status === "CANCELLED" || order.status === "DELIVERED";
  const unpaidOnline = order.paymentMethod !== "COD" && order.paymentStatus !== "PAID";

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh tối đa 5MB.");
      return;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setError("Chỉ nhận ảnh JPG, PNG hoặc WEBP.");
      return;
    }
    onUpload(file);
  }

  return (
    <section aria-labelledby="photo-heading" className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="photo-heading" className="flex items-center gap-2 text-base text-foreground">
          <Camera className="size-4 text-accent" aria-hidden="true" />
          Ảnh bó hoa thành phẩm
        </h2>
        {order.arrangementPhotoAt ? (
          <span className="num text-xs text-subtle-foreground">Đã gửi {formatShort(order.arrangementPhotoAt)}</span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        {order.arrangementPhotoUrl ? (
          <a href={resolveImageUrl(order.arrangementPhotoUrl)} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={resolveImageUrl(order.arrangementPhotoUrl)}
              alt="Ảnh bó hoa đã gửi khách"
              className="h-40 w-32 rounded-[var(--radius-md)] bg-surface-raised object-cover ring-1 ring-border"
            />
          </a>
        ) : null}
        <div className="min-w-0 flex-1 text-sm text-muted-foreground">
          <p>
            {order.arrangementPhotoUrl
              ? "Khách đã thấy ảnh này ở trang đơn và trong email. Tải ảnh khác sẽ thay ảnh cũ và báo lại khách."
              : "Cắm xong thì chụp bó hoa và tải lên — khách xem được ngay ở trang đơn và nhận email kèm ảnh trước khi giao."}
          </p>
          {closed ? (
            <p className="mt-3 text-xs text-subtle-foreground">Đơn đã đóng, không tải ảnh được nữa.</p>
          ) : unpaidOnline ? (
            <p className="mt-3 text-xs text-subtle-foreground">Đơn thanh toán trực tuyến chưa trả tiền — chưa cắm hoa.</p>
          ) : (
            <label className="mt-4 inline-flex">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <span
                className={
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-border-strong px-3 text-[0.8125rem] text-foreground transition-colors hover:border-accent " +
                  (busy ? "pointer-events-none opacity-60" : "")
                }
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
                {order.arrangementPhotoUrl ? "Tải ảnh khác" : "Tải ảnh bó hoa"}
              </span>
            </label>
          )}
          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}

function ItemsCard({ order }: { order: Order }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <section aria-labelledby="order-items-heading" className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id="order-items-heading" className="text-base text-foreground">
          Sản phẩm trong đơn
        </h2>
        <span className="num rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-muted-foreground">
          {itemCount} bó hoa{order.addons.length ? ` · ${order.addons.length} quà kèm` : ""}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-5 py-4">
            <img
              src={resolveImageUrl(item.imageUrl)}
              alt=""
              onError={(event) => {
                const img = event.currentTarget;
                if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
              }}
              className="size-16 shrink-0 rounded-[var(--radius-md)] bg-surface-raised object-cover ring-1 ring-border"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium text-foreground">{item.productName}</p>
              {item.sizeLabel || item.customRequestId != null ? (
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground">
                  {item.customRequestId != null ? (
                    <>
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">Làm theo yêu cầu</span>
                      {item.sizeLabel ? <span>{item.sizeLabel}</span> : null}
                      <Link to="/admin/requests?status=ORDERED" className="text-muted-foreground hover:text-accent hover:underline">
                        Xem yêu cầu
                      </Link>
                    </>
                  ) : (
                    `Cỡ ${item.sizeLabel}`
                  )}
                </p>
              ) : null}
              <p className="num mt-1 text-xs text-subtle-foreground">{formatPrice(item.unitPrice)} / bó</p>
            </div>
            <span className="num shrink-0 rounded-[var(--radius-sm)] bg-surface-raised px-2 py-1 text-xs text-muted-foreground">
              × {item.quantity}
            </span>
            <p className="num w-28 shrink-0 text-right font-medium text-foreground">{formatPrice(item.lineTotal)}</p>
          </li>
        ))}
        {order.addons.map((addon) => (
          <li key={addon.code} className="flex items-center gap-4 px-5 py-2.5">
            {/* Canh giua theo cot anh 64px cua dong hoa phia tren */}
            <span aria-hidden="true" className="flex w-16 shrink-0 justify-center">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Gift className="size-4" />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-foreground">{addon.name}</p>
              <p className="num mt-1 text-xs text-subtle-foreground">Quà kèm · {formatPrice(addon.unitPrice)}</p>
            </div>
            <span className="num shrink-0 rounded-[var(--radius-sm)] bg-surface-raised px-2 py-1 text-xs text-muted-foreground">
              × {addon.quantity}
            </span>
            <p className="num w-28 shrink-0 text-right text-foreground">{formatPrice(addon.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="border-t border-border bg-surface-raised/40 px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-1 text-muted-foreground">
              <CreditCard className="size-3.5" aria-hidden="true" />
              {order.paymentMethodLabel}
            </span>
            {order.voucherCode ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-2.5 py-1 text-accent">
                <TicketPercent className="size-3.5" aria-hidden="true" />
                {order.voucherCode}
              </span>
            ) : null}
          </div>

          <dl className="w-full space-y-2 text-sm sm:max-w-xs">
            <SummaryRow label="Tiền hoa" value={formatPrice(order.subtotal)} />
            {order.extrasTotal > 0 ? <SummaryRow label="Thiệp & quà kèm" value={formatPrice(order.extrasTotal)} /> : null}
            {order.discount > 0 ? (
              <SummaryRow label="Giảm giá" value={`−${formatPrice(order.discount)}`} valueClass="text-success" />
            ) : null}
            <SummaryRow
              label="Phí giao hàng"
              value={order.deliveryFee === 0 ? "Miễn phí" : formatPrice(order.deliveryFee)}
            />
            <div className="flex items-baseline justify-between border-t border-border-strong/60 pt-2.5">
              <dt className="font-medium text-foreground">Tổng cộng</dt>
              <dd className="num text-xl font-semibold text-accent">{formatPrice(order.total)}</dd>
            </div>
            <p className="text-right text-xs text-subtle-foreground">Giá chụp lại tại thời điểm đặt</p>
          </dl>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("num text-foreground", valueClass)}>{value}</dd>
    </div>
  );
}

/**
 * Xu ly don: nut chuyen sang buoc ke tiep (viec hay lam nhat), o chon de nhay coc,
 * nut huy. Chi hien lua chon backend se chap nhan (selectableStatuses).
 */
function ProcessCard({
  order,
  updating,
  onChange,
}: {
  order: Order;
  updating: boolean;
  onChange: (status: string) => void;
}) {
  const options = selectableStatuses(order);
  const forward = options.filter((s) => s !== order.status && s !== "CANCELLED") as OrderStep[];
  const next = forward[0];
  const canCancel = options.includes("CANCELLED");
  const waitingPayment =
    order.paymentMethod !== "COD" && order.paymentStatus !== "PAID" && order.status !== "CANCELLED";

  return (
    <section aria-labelledby="status-heading" className="card p-5">
      <h2 id="status-heading" className="text-base text-foreground">
        Xử lý đơn
      </h2>

      {order.status === "DELIVERED" || order.status === "CANCELLED" ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
          Đơn đã kết thúc, không đổi trạng thái được nữa.
        </p>
      ) : (
        <>
          {next ? (
            <>
              <Button
                variant="primary"
                size="md"
                className="mt-4 w-full justify-between"
                disabled={updating}
                onClick={() => onChange(next)}
              >
                <span>Chuyển sang: {ORDER_STATUS_LABELS[next].label}</span>
                {updating ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
              </Button>
              <p className="mt-2 text-xs leading-relaxed text-subtle-foreground">{NEXT_HINT[next]}</p>
            </>
          ) : null}

          {hasActiveShipment(order) ? (
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-subtle-foreground">
              <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Đơn đang giao qua GHN: bước “Đang giao” và “Đã giao” tự cập nhật từ GHN (hoặc bấm “Cập nhật từ GHN”).
                Studio muốn tự giao thì huỷ vận đơn ở khối Vận chuyển.
              </span>
            </p>
          ) : null}

          {waitingPayment ? (
            <p className="mt-3 rounded-[var(--radius-sm)] bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning">
              Khách chọn {order.paymentMethodLabel} nhưng chưa trả tiền — chưa chuẩn bị hay giao được. Đơn tự huỷ
              sau 30 phút nếu vẫn chưa thanh toán.
            </p>
          ) : null}

          {forward.length > 1 ? (
            <div className="mt-4">
              <Label htmlFor="order-status" className="mb-1.5">
                Hoặc chuyển thẳng tới
              </Label>
              <NativeSelect
                id="order-status"
                value=""
                disabled={updating}
                onChange={(event) => event.target.value && onChange(event.target.value)}
              >
                <option value="">Chọn bước…</option>
                {forward.slice(1).map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s].label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          {canCancel ? (
            <Button
              variant="danger"
              size="sm"
              className="mt-4 w-full"
              disabled={updating}
              onClick={() => onChange("CANCELLED")}
            >
              <Ban aria-hidden="true" />
              Huỷ đơn
            </Button>
          ) : order.status === "SHIPPING" ? (
            <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
              Hoa đã rời cửa hàng nên không huỷ được. Khách từ chối nhận thì GHN sẽ trả hàng về.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * Van chuyen GHN: ma van don, trang thai, cac con so (thu ho, phi, khoi luong, du kien)
 * va hanh trinh. Chua co van don thi giai thich vi sao va cho tao.
 */
function ShippingCard({
  order,
  busy,
  onRefresh,
  onCreate,
  onCancel,
  sandbox,
  onSimulate,
}: {
  order: Order;
  busy: string | null;
  onRefresh: () => void;
  onCreate: () => void;
  onCancel: () => void;
  sandbox: boolean;
  onSimulate: (status: "picked" | "delivering" | "delivered", label: string) => void;
}) {
  // Buoc tiep theo cua shipper gia lap, theo trang thai van don hien tai
  const simNext: { status: "picked" | "delivering" | "delivered"; label: string } | null = !sandbox
    ? null
    : beforePickup(order.shippingStatus)
      ? { status: "picked", label: "Shipper đã lấy hàng" }
      : ["picked", "storing", "transporting", "sorting"].includes(order.shippingStatus ?? "")
        ? { status: "delivering", label: "Shipper đang giao" }
        : ["delivering", "money_collect_delivering", "delivery_fail"].includes(order.shippingStatus ?? "")
          ? { status: "delivered", label: "Giao thành công" }
          : null;
  // Don da danh dau giao (tay, truoc khi co chan) nhung GHN chua toi lay: hai ben dang lech nhau
  const outOfSync =
    hasActiveShipment(order) && (order.status === "DELIVERED" || order.status === "SHIPPING") && beforePickup(order.shippingStatus);
  const [copied, setCopied] = useState(false);
  const hasShipment = Boolean(order.ghnOrderCode) && order.shippingStatus !== "cancel";
  const events = [...order.shippingEvents].reverse();

  async function copyCode() {
    if (!order.ghnOrderCode) return;
    try {
      await navigator.clipboard.writeText(order.ghnOrderCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Trinh duyet chan clipboard - ma van hien de boi den chep tay */
    }
  }

  return (
    <section aria-labelledby="shipping-heading" className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id="shipping-heading" className="flex items-center gap-2 text-base text-foreground">
          <Truck className="size-4 text-accent" aria-hidden="true" />
          Vận chuyển
          <span className="text-xs font-normal text-subtle-foreground">· Giao Hàng Nhanh</span>
        </h2>
        {hasShipment ? (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", shippingTone(order.shippingStatus))}>
            {order.shippingStatusLabel ?? order.shippingStatus}
          </span>
        ) : null}
      </div>

      {outOfSync ? (
        <div className="border-b border-warning/30 bg-warning/10 px-5 py-3 text-sm text-foreground">
          Đơn đã được đánh dấu <b>{order.statusLabel ?? order.status}</b> nhưng vận đơn GHN vẫn ở “
          {order.shippingStatusLabel ?? order.shippingStatus}” — shipper GHN chưa tới lấy hàng. Nếu studio đã tự
          giao, hãy <b>huỷ vận đơn</b> để GHN không tới lấy và không thu hộ nhầm.
        </div>
      ) : null}

      {hasShipment ? (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Thong tin van don */}
          <div className="space-y-4 px-5 py-4 md:border-r md:border-border">
            <div>
              <p className="text-xs text-subtle-foreground">Mã vận đơn</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="num text-lg tracking-wider text-foreground">{order.ghnOrderCode}</span>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-subtle-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  {copied ? <Check className="size-3.5 text-success" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                  <span className="sr-only">{copied ? "Đã chép" : "Chép mã vận đơn"}</span>
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <ShipFact label="Thu hộ (COD)">
                {order.codAmount == null
                  ? "—"
                  : order.codAmount === 0
                    ? <span className="text-muted-foreground">Không thu · đã trả trước</span>
                    : <span className="font-medium text-warning">{formatPrice(order.codAmount)}</span>}
              </ShipFact>
              <ShipFact label="Phí GHN (cửa hàng trả)">
                {order.ghnFee == null ? "—" : formatPrice(order.ghnFee)}
              </ShipFact>
              <ShipFact label="Khối lượng tính phí">{formatWeight(order.shippingWeight)}</ShipFact>
              <ShipFact label="Dự kiến giao">{formatShort(order.expectedDeliveryAt)}</ShipFact>
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <p className="num text-xs text-subtle-foreground">Cập nhật {formatShort(order.shippingUpdatedAt)}</p>
              <div className="flex flex-wrap gap-2">
                {/*
                  Chi moi truong thu GHN (khong co shipper that): gia lap buoc tiep theo nhu GHN bao ve.
                  Moi truong that thi nut nay khong hien.
                */}
                {simNext ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    title="Môi trường thử GHN: giả lập shipper"
                    onClick={() => onSimulate(simNext.status, simNext.label)}
                  >
                    {busy === "ship-sim" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Truck aria-hidden="true" />}
                    {simNext.label}
                  </Button>
                ) : null}
                {beforePickup(order.shippingStatus) ? (
                  <Button variant="ghost" size="sm" disabled={busy !== null} onClick={onCancel}>
                    {busy === "ship-cancel" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Ban aria-hidden="true" />}
                    Huỷ vận đơn
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" disabled={busy !== null} onClick={onRefresh}>
                  {busy === "ship-refresh" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                  Cập nhật từ GHN
                </Button>
              </div>
            </div>
          </div>

          {/* Hanh trinh */}
          <div className="border-t border-border px-5 py-4 md:border-t-0">
            <p className="text-xs text-subtle-foreground">Hành trình</p>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Chưa có mốc nào — bấm “Cập nhật từ GHN”.</p>
            ) : (
              <ol className="mt-3 space-y-0">
                {events.map((event, i) => (
                  <li key={`${event.status}-${event.at}`} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < events.length - 1 ? (
                      <span aria-hidden="true" className="absolute top-3 left-[5px] h-full w-px bg-border-strong" />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative z-10 mt-1 size-[11px] shrink-0 rounded-full border-2",
                        i === 0 ? "border-accent bg-accent" : "border-border-strong bg-surface",
                      )}
                    />
                    <div className="min-w-0">
                      <p className={cn("text-sm", i === 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {event.label}
                      </p>
                      <p className="num text-xs text-subtle-foreground">{formatShort(event.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : (
        <div className="px-5 py-4">
          {order.districtId == null ? (
            <p className="text-sm text-muted-foreground">
              Đơn nhập địa chỉ tự do (không theo danh mục GHN) — cửa hàng tự giao, cập nhật trạng thái ở khối
              &ldquo;Xử lý đơn&rdquo;.
            </p>
          ) : order.status === "CANCELLED" || order.status === "DELIVERED" ? (
            <p className="text-sm text-muted-foreground">Đơn đã kết thúc, không tạo vận đơn.</p>
          ) : order.status === "SHIPPING" ? (
            <p className="text-sm text-muted-foreground">Đơn đang được cửa hàng tự giao, không dùng GHN.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {order.paymentMethod !== "COD" && order.paymentStatus !== "PAID"
                  ? "Đơn thanh toán trực tuyến chưa trả tiền — chưa tạo vận đơn được."
                  : order.paymentStatus === "PAID"
                    ? "Khách đã thanh toán: GHN không thu hộ (COD = 0)."
                    : `Shipper sẽ thu hộ ${formatPrice(order.total)}.`}
                {order.shippingStatus === "cancel" ? " Vận đơn trước đã huỷ." : ""}
              </p>
              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                disabled={busy !== null || (order.paymentMethod !== "COD" && order.paymentStatus !== "PAID")}
                onClick={onCreate}
              >
                {busy === "ship-create" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Truck aria-hidden="true" />}
                Tạo vận đơn GHN
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ShipFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="num mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-subtle-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-subtle-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}
