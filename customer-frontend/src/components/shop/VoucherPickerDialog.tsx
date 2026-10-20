import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VoucherTicket } from "@/components/shop/VoucherTicket";
import type { MyVoucher } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Popup chon ma giam gia o trang dat hoa: go ma tay, hoac chon trong vi ma cua khach
 * (ma chung dang chay + ma rieng). Ma chua dung duoc van hien, lam mo kem ly do, de khach
 * biet con thieu gi (mua them bao nhieu, het han...).
 *
 * onApply tra ve null khi ap duoc, hoac cau bao loi cua server.
 */
export function VoucherPickerDialog({
  open,
  onOpenChange,
  vouchers,
  amount,
  appliedCode,
  onApply,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vouchers: MyVoucher[] | null;
  amount: number;
  appliedCode: string | null;
  onApply: (code: string) => Promise<string | null>;
  onRemove: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(appliedCode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"typed" | "picked" | null>(null);

  // Moi lan mo: chon san ma dang ap, xoa loi cu
  useEffect(() => {
    if (!open) return;
    setPicked(appliedCode);
    setTyped("");
    setError(null);
  }, [open, appliedCode]);

  const usable = (vouchers ?? []).filter((v) => v.status === "USABLE");
  const others = (vouchers ?? []).filter((v) => v.status !== "USABLE");
  const pickedVoucher = usable.find((v) => v.code === picked) ?? null;

  async function apply(code: string, source: "typed" | "picked") {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Nhập mã giảm giá.");
      return;
    }
    setBusy(source);
    setError(null);
    const message = await onApply(trimmed);
    setBusy(null);
    if (message) {
      setError(message);
    } else {
      onOpenChange(false);
    }
  }

  const footer = (
    <>
      {appliedCode ? (
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => {
            onRemove();
            onOpenChange(false);
          }}
        >
          Bỏ mã
        </Button>
      ) : null}
      <Button
        type="button"
        variant="primary"
        size="md"
        disabled={!pickedVoucher || busy !== null || pickedVoucher.code === appliedCode}
        onClick={() => pickedVoucher && void apply(pickedVoucher.code, "picked")}
      >
        {busy === "picked" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {pickedVoucher && pickedVoucher.code !== appliedCode
          ? `Dùng mã · giảm ${formatPrice(pickedVoucher.discount)}`
          : "Dùng mã"}
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} title="Chọn mã giảm giá" footer={footer} className="w-[min(34rem,calc(100vw-2rem))]">
        {/* Go ma tay */}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            // Form rieng trong portal: Enter o day chi ap ma, khong dat hang
            event.preventDefault();
            event.stopPropagation();
            void apply(typed, "typed");
          }}
        >
          <label htmlFor="voucher-code" className="sr-only">
            Nhập mã giảm giá
          </label>
          <input
            id="voucher-code"
            value={typed}
            onChange={(event) => setTyped(event.target.value.toUpperCase())}
            maxLength={30}
            placeholder="Nhập mã giảm giá"
            autoComplete="off"
            className="num min-w-0 flex-1 border border-border-strong bg-transparent px-3 py-2 text-sm uppercase tracking-wider text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none"
          />
          <Button type="submit" variant="outline" size="md" disabled={busy !== null || !typed.trim()}>
            {busy === "typed" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Áp dụng
          </Button>
        </form>
        {error ? (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        {/* Vi ma */}
        <div className="-mx-6 mt-5 max-h-[min(26rem,55vh)] overflow-y-auto border-t border-border px-6 pb-1 pt-4">
          {vouchers === null ? (
            <p className="flex items-center gap-2 py-6 text-sm font-light text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Đang tải mã của bạn…
            </p>
          ) : vouchers.length === 0 ? (
            <p className="py-6 text-sm font-light text-muted-foreground">
              Bạn chưa có mã nào. Có mã từ studio thì nhập ở ô phía trên.
            </p>
          ) : (
            <>
              {usable.length > 0 ? (
                <fieldset>
                  <legend className="text-xs text-muted-foreground">Dùng được cho đơn này</legend>
                  <div role="radiogroup" className="mt-2.5 space-y-2.5">
                    {usable.map((v) => {
                      const checked = picked === v.code;
                      return (
                        <button
                          key={v.code}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          onClick={() => setPicked(checked ? null : v.code)}
                          className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <VoucherTicket
                            voucher={v}
                            amount={amount}
                            selected={checked}
                            aside={
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                                  checked ? "border-accent bg-accent text-background" : "border-border-strong",
                                )}
                              >
                                {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                              </span>
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              {others.length > 0 ? (
                <div className={cn(usable.length > 0 && "mt-6")}>
                  <p className="text-xs text-muted-foreground">Chưa dùng được</p>
                  <ul className="mt-2.5 space-y-2.5">
                    {others.map((v) => (
                      <li key={v.code}>
                        <VoucherTicket voucher={v} amount={amount} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>

        <p className="mt-4 text-[11px] font-light text-muted-foreground">
          Mỗi đơn dùng một mã.{" "}
          <Link
            to="/tai-khoan/ma-giam-gia"
            onClick={() => onOpenChange(false)}
            className="text-accent hover:text-accent-strong"
          >
            Xem mọi mã của bạn
          </Link>
          {" · "}
          <Link to="/voucher" onClick={() => onOpenChange(false)} className="text-accent hover:text-accent-strong">
            Săn thêm voucher
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
