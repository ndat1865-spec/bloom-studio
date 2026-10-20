import { useEffect, useState } from "react";
import { CreditCard, Loader2, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import {
  api,
  type OnlineProvider,
  type Order,
  type Payment,
  type PaymentMethodOption,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "14:05 · 27/9/2026" */
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} · ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

const PAYMENT_TONE: Record<Order["paymentStatus"], string> = {
  PAID: "border-success text-success",
  UNPAID: "border-border-strong text-muted-foreground",
  REFUND_PENDING: "border-danger text-danger",
  REFUNDED: "border-accent text-accent",
};

/**
 * Thanh toan + van chuyen cua mot don (cot phai trang chi tiet don cua khach, xep mot cot).
 *
 * - Don chon cong truc tuyen ma chua tra (vd. khach bam huy o trang MoMo): cho thanh toan
 *   lai, doi cong cung duoc. So tien van do server lay tu don.
 * - Giao dich dang cho: tu hoi lai cong luc mo trang / quay lai tab; "Kiem tra lai" de
 *   khach tu hoi, phong khi IPN khong toi.
 * - Van don GHN: ma, trang thai, du kien giao; "Cap nhat" hoi lai GHN.
 */
export function OrderPaymentPanel({
  order,
  onOrderChange,
  initialError,
}: {
  order: Order;
  onOrderChange: (order: Order) => void;
  initialError?: string | null;
}) {
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [provider, setProvider] = useState<OnlineProvider | null>(
    order.paymentMethod === "COD" ? null : order.paymentMethod,
  );
  const [busy, setBusy] = useState<"pay" | "check" | "ship" | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listPaymentMethods(controller.signal)
      .then((list) => setMethods(list.filter((m) => m.online)))
      .catch(() => setMethods([]));
    api
      .listOrderPayments(order.id, controller.signal)
      .then(setPayments)
      .catch(() => setPayments([]));
    return () => controller.abort();
  }, [order.id, order.paymentStatus]);

  const canPay =
    order.status === "PENDING" &&
    order.paymentStatus === "UNPAID" &&
    order.paymentMethod !== "COD" &&
    methods.length > 0;
  const pending = payments.find((p) => p.status === "PENDING");
  const pendingId = pending?.id ?? null;

  /**
   * Tu hoi lai giao dich dang cho: luc mo trang va moi lan khach quay lai tab nay.
   * Can khi cong khong dua khach ve (ZaloPay chan redirect toi http://) va IPN cua cong
   * khong toi duoc may chay local. Chay im lang: chi bao khi co ket qua that, loi thi
   * bo qua vi nut "Toi da tra — kiem tra lai" van con.
   */
  useEffect(() => {
    if (pendingId == null || order.paymentStatus !== "UNPAID") return;
    let stopped = false;
    async function silentCheck(id: number) {
      try {
        const payment = await api.refreshPayment(id);
        if (stopped) return;
        setPayments((list) => list.map((p) => (p.id === payment.id ? payment : p)));
        if (payment.status === "PENDING") return;
        if (payment.status === "SUCCESS") setInfo("Đã nhận được tiền.");
        const next = await api.getOrder(order.id);
        if (!stopped) onOrderChange(next);
      } catch {
        // Im lang - khach van tu bam kiem tra lai duoc
      }
    }
    void silentCheck(pendingId);
    const onVisible = () => {
      if (document.visibilityState === "visible") void silentCheck(pendingId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId, order.id, order.paymentStatus]);

  async function pay() {
    const chosen = provider ?? methods[0]?.code;
    if (!chosen || chosen === "COD") return;
    setBusy("pay");
    setError(null);
    try {
      const payment = await api.createPayment(order.id, chosen as OnlineProvider);
      if (payment.payUrl) {
        window.location.assign(payment.payUrl);
        return;
      }
      setError("Cổng thanh toán không trả về đường dẫn.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không mở được cổng thanh toán.");
    }
    setBusy(null);
  }

  async function checkAgain() {
    if (!pending) return;
    setBusy("check");
    setError(null);
    setInfo(null);
    try {
      const payment = await api.refreshPayment(pending.id);
      setPayments((list) => list.map((p) => (p.id === payment.id ? payment : p)));
      setInfo(
        payment.status === "SUCCESS"
          ? "Đã nhận được tiền."
          : payment.status === "FAILED"
            ? `Giao dịch không thành công: ${payment.message ?? ""}`
            : "Cổng thanh toán chưa ghi nhận tiền. Nếu bạn vừa trả, đợi một phút rồi thử lại.",
      );
      onOrderChange(await api.getOrder(order.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không kiểm tra được giao dịch.");
    }
    setBusy(null);
  }

  async function refreshShipment() {
    setBusy("ship");
    setError(null);
    try {
      onOrderChange(await api.refreshShipment(order.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được vận đơn.");
    }
    setBusy(null);
  }

  return (
    <section aria-labelledby="payment-shipping-heading" className="grid grid-cols-1 gap-4">
      <h2 id="payment-shipping-heading" className="sr-only">
        Thanh toán và vận chuyển
      </h2>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {info ? <Notice tone="success">{info}</Notice> : null}

      {/* ---------- Thanh toan ---------- */}
      <div className="bg-surface p-6">
        <p className="label-micro flex items-center gap-2 text-accent">
          <CreditCard className="size-3.5" aria-hidden="true" />
          Thanh toán
        </p>
        <p className="mt-4 text-sm text-foreground">{order.paymentMethodLabel}</p>
        <span className={cn("label-micro mt-3 inline-flex border px-3 py-2", PAYMENT_TONE[order.paymentStatus])}>
          {order.paymentStatusLabel}
        </span>
        {order.paidAt ? (
          <p className="num mt-3 text-xs text-muted-foreground">Lúc {formatDateTime(order.paidAt)}</p>
        ) : null}
        {order.paymentStatus === "REFUND_PENDING" ? (
          <p className="mt-4 text-xs font-light leading-relaxed text-muted-foreground">
            Đơn đã huỷ sau khi bạn thanh toán. Studio sẽ hoàn {formatPrice(order.total)} về tài khoản đã
            dùng để trả.
          </p>
        ) : null}
        {order.paymentStatus === "REFUNDED" ? (
          <p className="mt-4 text-xs font-light leading-relaxed text-muted-foreground">
            Studio đã hoàn {formatPrice(order.total)} qua {order.paymentMethodLabel}. Tuỳ ngân hàng, tiền có thể
            mất vài ngày làm việc mới hiện trong tài khoản.
          </p>
        ) : null}

        {canPay ? (
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs font-light text-muted-foreground">
              Đơn chưa được thanh toán. Chọn cổng rồi thanh toán lại — chưa trả sau 30 phút kể từ lúc đặt
              thì đơn tự huỷ.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {methods.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => setProvider(m.code as OnlineProvider)}
                  className={cn(
                    "border px-3 py-2 text-xs transition-colors",
                    (provider ?? methods[0]?.code) === m.code
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-border-strong",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="primary" size="md" onClick={() => void pay()} disabled={busy !== null}>
                {busy === "pay" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Thanh toán {formatPrice(order.total)}
              </Button>
              {pending ? (
                <Button variant="ghost" size="md" onClick={() => void checkAgain()} disabled={busy !== null}>
                  {busy === "check" ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw aria-hidden="true" />
                  )}
                  Tôi đã trả — kiểm tra lại
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------- Van chuyen ---------- */}
      <div className="bg-surface p-6">
        <p className="label-micro flex items-center gap-2 text-accent">
          <Truck className="size-3.5" aria-hidden="true" />
          Vận chuyển
        </p>
        {order.ghnOrderCode ? (
          <>
            <p className="mt-5 text-sm text-foreground">
              Giao Hàng Nhanh · <span className="num tracking-wider">{order.ghnOrderCode}</span>
            </p>
            <p className="mt-3 text-sm text-foreground">{order.shippingStatusLabel ?? "—"}</p>
            {order.expectedDeliveryAt ? (
              <p className="num mt-2 text-xs text-muted-foreground">
                Dự kiến giao: {formatDateTime(order.expectedDeliveryAt)}
              </p>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="mt-5"
              onClick={() => void refreshShipment()}
              disabled={busy !== null}
            >
              {busy === "ship" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              Cập nhật trạng thái
            </Button>
          </>
        ) : (
          <p className="mt-5 text-sm font-light leading-relaxed text-muted-foreground">
            {order.status === "CANCELLED"
              ? "Đơn đã huỷ."
              : order.districtId
                ? "Studio sẽ tạo vận đơn Giao Hàng Nhanh khi hoa được bó xong."
                : "Studio giao trực tiếp đơn này."}
          </p>
        )}
      </div>
    </section>
  );
}
