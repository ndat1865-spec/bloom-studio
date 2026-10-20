import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Notice } from "@/components/ui/feedback";
import { api, type Order } from "@/lib/api";

/**
 * Nut huy don cua khach.
 *
 * Chi hien khi don con PENDING / CONFIRMED — trung voi luat cua DELETE /orders/{id} o
 * order-service. Tu PREPARING tro di backend tra 409, nen an nut luon de khach khong bam
 * vao mot nut chac chan that bai; luc do khach lien he studio qua khung chat.
 */
export function CancelOrderButton({ order, onCancelled }: { order: Order; onCancelled: (order: Order) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.status !== "PENDING" && order.status !== "CONFIRMED") return null;

  const paidOnline = order.paymentMethod !== "COD" && order.paymentStatus === "PAID";

  async function confirmCancel() {
    setBusy(true);
    setError(null);
    try {
      const cancelled = await api.cancelOrder(order.id);
      setOpen(false);
      onCancelled(cancelled);
    } catch (err) {
      // 409 khi studio vua bat tay cam hoa: hien nguyen loi backend, khong doan
      setError(err instanceof Error ? err.message : "Không huỷ được đơn.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="lg"
        className="w-full"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Huỷ đơn hàng
      </Button>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent
          open={open}
          title={`Huỷ đơn ${order.code}?`}
          description={
            paidOnline
              ? `Đơn đã thanh toán qua ${order.paymentMethodLabel}. Sau khi huỷ, studio sẽ hoàn tiền về tài khoản bạn đã dùng để trả.`
              : "Studio sẽ không chuẩn bị bó hoa này nữa. Thao tác này không hoàn tác được."
          }
          footer={
            <>
              <Button type="button" variant="ghost" size="md" disabled={busy} onClick={() => setOpen(false)}>
                Giữ đơn
              </Button>
              <Button type="button" variant="danger" size="md" disabled={busy} onClick={() => void confirmCancel()}>
                {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Huỷ đơn
              </Button>
            </>
          }
        >
          {error ? <Notice tone="error">{error}</Notice> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
