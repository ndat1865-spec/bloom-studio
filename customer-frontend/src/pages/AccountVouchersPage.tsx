import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { VoucherTicket } from "@/components/shop/VoucherTicket";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { api, type MyVoucher } from "@/lib/api";

/**
 * Tai khoan > Ma giam gia cua toi: ma chung dang chay + ma studio tang rieng cho khach.
 * Ma rieng da dung / het han van giu lai o cuoi trang de khach thay lich su.
 * Dung ma o trang dat hoa (popup "Chon ma giam gia"), trang nay chi xem va chep ma.
 */
export default function AccountVouchersPage() {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<MyVoucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const userId = user?.id;

  useEffect(() => {
    if (userId == null) return;
    const controller = new AbortController();
    setError(null);
    api
      .listMyVouchers(undefined, controller.signal)
      .then(setVouchers)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Không tải được mã giảm giá.");
      });
    return () => controller.abort();
  }, [userId, reloadKey]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
    } catch {
      // Trinh duyet chan clipboard: van hien ma ro rang tren ve, khach tu go
      setCopied(null);
    }
  }

  if (!user) return null;

  const usable = (vouchers ?? []).filter((v) => v.status === "USABLE");
  const history = (vouchers ?? []).filter((v) => v.status !== "USABLE");

  return (
    <AccountLayout
      eyebrow="Ưu đãi"
      title="Mã giảm giá của tôi"
      description="Mã studio tặng riêng cho bạn và mã đang áp dụng cho mọi khách. Chọn mã ở bước đặt hoa, mỗi đơn dùng một mã."
      action={
        <Button variant="outline" size="sm" asChild>
          <Link to="/products">Chọn hoa</Link>
        </Button>
      }
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
      ) : vouchers === null ? (
        <Spinner label="Đang tải mã giảm giá…" />
      ) : vouchers.length === 0 ? (
        <EmptyState
          title="Chưa có mã nào"
          description="Khi studio tặng mã cho bạn hoặc có chương trình ưu đãi, mã sẽ nằm ở đây."
          action={
            <Button variant="primary" size="lg" asChild>
              <Link to="/products">Xem hoa đang bán</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {usable.length > 0 ? (
            <section aria-labelledby="vouchers-usable">
              <h2 id="vouchers-usable" className="text-sm text-muted-foreground">
                Đang dùng được <span className="num">({usable.length})</span>
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {usable.map((v) => (
                  <li key={v.code}>
                    <VoucherTicket
                      voucher={v}
                      aside={
                        <button
                          type="button"
                          onClick={() => void copy(v.code)}
                          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-accent transition-colors hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {copied === v.code ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Copy className="size-3.5" aria-hidden="true" />
                          )}
                          {copied === v.code ? "Đã chép" : "Chép mã"}
                        </button>
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {history.length > 0 ? (
            <section aria-labelledby="vouchers-history">
              <h2 id="vouchers-history" className="text-sm text-muted-foreground">
                Đã dùng hoặc hết hạn
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {history.map((v) => (
                  <li key={v.code}>
                    <VoucherTicket voucher={v} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </AccountLayout>
  );
}
