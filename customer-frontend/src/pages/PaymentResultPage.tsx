import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { api, type Payment } from "@/lib/api";
import { formatPrice } from "@/lib/format";

/**
 * Trang VNPay / MoMo / ZaloPay dua khach ve sau khi thanh toan.
 *
 * KHONG tu doc ket qua tren URL (vnp_ResponseCode=00, resultCode=0, status=1...) de bao
 * thanh cong: khach sua duoc thanh dia chi. Chuyen NGUYEN bo tham so len payment-service,
 * server kiem chu ky bang khoa bi mat roi moi tra ket qua that.
 */
export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  // StrictMode goi effect hai lan o che do dev - chi gui mot lan
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const params = Object.fromEntries(searchParams.entries());
    if (Object.keys(params).length === 0) {
      setError("Không có kết quả thanh toán trên đường dẫn.");
      return;
    }
    api
      .confirmPaymentReturn(params)
      .then(setPayment)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Không xác nhận được kết quả."));
  }, [searchParams]);

  if (!payment && !error) {
    return (
      <div className="shell page-pad flex min-h-[50svh] items-center justify-center">
        <Spinner label="Đang xác nhận kết quả thanh toán…" />
      </div>
    );
  }

  const status = payment?.status;
  const Icon = status === "SUCCESS" ? CheckCircle2 : status === "PENDING" ? Clock : XCircle;
  const tone = status === "SUCCESS" ? "text-success" : status === "PENDING" ? "text-accent" : "text-danger";
  const title =
    status === "SUCCESS"
      ? "Thanh toán thành công"
      : status === "PENDING"
        ? "Đang chờ xác nhận"
        : "Thanh toán chưa thành công";

  return (
    <div className="shell page-pad">
      <div className="mx-auto max-w-xl bg-surface p-8 sm:p-10">
        <p className={`label-micro flex items-center gap-2 ${tone}`}>
          <Icon className="size-4" aria-hidden="true" />
          {payment?.providerLabel ?? "Kết quả thanh toán"}
        </p>
        <h1 className="display-section mt-5 text-foreground">{title}</h1>
        <span aria-hidden="true" className="mt-6 block h-px w-28 bg-accent" />

        {payment ? (
          <dl className="mt-8 space-y-4 text-sm">
            <div className="flex justify-between gap-6 border-b border-border pb-4">
              <dt className="text-muted-foreground">Đơn hàng</dt>
              <dd className="num tracking-wider text-foreground">{payment.orderCode}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-border pb-4">
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="num text-foreground">{formatPrice(payment.amount)}</dd>
            </div>
            {payment.providerTxnId ? (
              <div className="flex justify-between gap-6 border-b border-border pb-4">
                <dt className="text-muted-foreground">Mã giao dịch</dt>
                <dd className="num text-foreground">{payment.providerTxnId}</dd>
              </div>
            ) : null}
            {payment.message ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">Ghi chú</dt>
                <dd className="text-right text-foreground">{payment.message}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-8 text-sm text-danger">{error}</p>
        )}

        {payment?.refundRequired ? (
          <p className="mt-6 text-xs font-light leading-relaxed text-muted-foreground">
            Tiền đã bị trừ nhưng đơn không còn nhận thanh toán. Studio sẽ hoàn lại số tiền này.
          </p>
        ) : null}

        <div className="mt-9 flex flex-wrap gap-3">
          {payment ? (
            <Button variant="primary" size="lg" asChild>
              <Link to={`/orders/${payment.orderId}`} replace>
                {status === "SUCCESS" ? "Xem đơn hàng →" : "Về đơn hàng để thanh toán lại →"}
              </Link>
            </Button>
          ) : (
            <Button variant="primary" size="lg" asChild>
              <Link to="/tai-khoan/don-hang">Đơn hàng của tôi →</Link>
            </Button>
          )}
          <Button variant="ghost" size="lg" asChild>
            <Link to="/products">Tiếp tục mua hoa</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
