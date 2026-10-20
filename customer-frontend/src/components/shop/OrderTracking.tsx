import { Camera, Check } from "lucide-react";
import type { Order } from "@/lib/api";
import { FALLBACK_IMAGE, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Theo doi don cho khach: 5 buoc Cho xac nhan -> Da xac nhan -> Dang cam hoa ->
 * Dang giao -> Da giao, kem gio tung buoc; ben duoi la anh bo hoa that (neu studio da
 * tai len) canh hanh trinh GHN (neu co van don).
 * Don da huy thi khong ve tien trinh (khong con "buoc tiep theo" nao).
 */

const STEPS: { status: string; label: string; at: (o: Order) => string | null | undefined }[] = [
  { status: "PENDING", label: "Đã đặt", at: (o) => o.createdAt },
  { status: "CONFIRMED", label: "Đã xác nhận", at: (o) => o.confirmedAt },
  { status: "PREPARING", label: "Đang cắm hoa", at: (o) => o.preparingAt },
  { status: "SHIPPING", label: "Đang giao", at: (o) => o.shippingAt },
  { status: "DELIVERED", label: "Đã nhận hoa", at: (o) => o.deliveredAt },
];

/** "14:05 · 27/9" */
function formatShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} · ${date.getDate()}/${date.getMonth() + 1}`;
}

export function OrderTracking({ order }: { order: Order }) {
  if (order.status === "CANCELLED") return null;

  const current = STEPS.findIndex((s) => s.status === order.status);
  const delivered = order.status === "DELIVERED";
  const events = [...(order.shippingEvents ?? [])].reverse();
  const hasGhn = Boolean(order.ghnOrderCode) && order.shippingStatus !== "cancel";
  const waitingPhoto = !order.arrangementPhotoUrl && (order.status === "CONFIRMED" || order.status === "PREPARING");
  const hasDetails = Boolean(order.arrangementPhotoUrl) || waitingPhoto || hasGhn;

  return (
    <section aria-labelledby="tracking-heading" className="mt-10 bg-surface p-6 sm:p-8">
      <h2 id="tracking-heading" className="sr-only">
        Theo dõi đơn
      </h2>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-0">
        {STEPS.map((step, i) => {
          const done = i < current || (delivered && i === current);
          const active = i === current && !delivered;
          const time = i <= current ? formatShort(step.at(order)) : null;
          return (
            <li
              key={step.status}
              aria-current={i === current ? "step" : undefined}
              className="relative flex items-center gap-4 sm:flex-col sm:gap-3 sm:text-center"
            >
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[calc(50%+1.5rem)] top-[1.125rem] hidden h-0.5 w-[calc(100%-3rem)] rounded-full sm:block",
                    i < current ? "bg-accent" : "bg-border",
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-xs",
                  done && "border-accent bg-accent text-background",
                  active && "border-accent bg-accent/15 text-accent ring-4 ring-accent/15",
                  !done && !active && "border-border text-muted-foreground/60",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
              </span>
              <span>
                <span
                  className={cn(
                    "block text-sm",
                    active ? "text-accent" : done ? "text-foreground" : "font-light text-muted-foreground/70",
                  )}
                >
                  {step.label}
                </span>
                {time ? <span className="num mt-0.5 block text-xs text-muted-foreground">{time}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>

      {hasDetails ? (
        <div
          className={cn(
            "mt-8 grid grid-cols-1 gap-8 border-t border-border pt-7",
            (order.arrangementPhotoUrl || waitingPhoto) && "md:grid-cols-[15rem_1fr]",
          )}
        >
          {/*
            Anh bo hoa that truoc khi giao: dieu nguoi dat hoa tang mong nhat — nhat la khi
            nguoi nhan o xa va ho khong tu tay trao duoc.
          */}
          {order.arrangementPhotoUrl ? (
            <figure className="max-w-[15rem]">
              <a
                href={resolveImageUrl(order.arrangementPhotoUrl)}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden bg-surface-raised"
              >
                <img
                  src={resolveImageUrl(order.arrangementPhotoUrl)}
                  alt="Ảnh bó hoa đã cắm xong"
                  onError={(event) => {
                    const img = event.currentTarget;
                    if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                  }}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 bg-background/80 px-2 py-1 text-[11px] text-foreground backdrop-blur-sm">
                  <Camera className="size-3 text-accent" aria-hidden="true" />
                  Ảnh thật
                </span>
              </a>
              <figcaption className="mt-3 text-xs font-light leading-relaxed text-muted-foreground">
                {formatShort(order.arrangementPhotoAt) ? (
                  <span className="num block text-foreground/80">Thợ hoa chụp lúc {formatShort(order.arrangementPhotoAt)}</span>
                ) : null}
                Muốn chỉnh gì (thêm ruy băng, đổi giấy gói…), gọi studio trước giờ giao nhé.
              </figcaption>
            </figure>
          ) : waitingPhoto ? (
            <div className="flex aspect-[4/5] max-w-[15rem] flex-col items-center justify-center gap-3 border border-dashed border-border-strong/60 px-6 text-center">
              <Camera className="size-6 text-accent" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-xs font-light leading-relaxed text-muted-foreground">
                Thợ hoa sẽ chụp ảnh bó thật và gửi vào đây trước khi giao.
              </p>
            </div>
          ) : null}

          {hasGhn ? (
            <div className="min-w-0">
              <p className="text-sm font-light text-muted-foreground">
                Giao Hàng Nhanh · mã vận đơn{" "}
                <span className="num tracking-wider text-foreground">{order.ghnOrderCode}</span>
              </p>
              {events.length > 0 ? (
                <ol className="relative mt-5 space-y-5 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-border">
                  {events.map((event, i) => (
                    <li key={`${event.status}-${event.at}`} className="relative flex gap-4">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative mt-1.5 size-[7px] shrink-0 rounded-full",
                          i === 0 ? "bg-accent ring-4 ring-accent/20" : "bg-border-strong",
                        )}
                      />
                      <span>
                        <span className={cn("block text-sm", i === 0 ? "text-foreground" : "font-light text-muted-foreground")}>
                          {event.label}
                        </span>
                        <span className="num block text-xs text-muted-foreground">{formatShort(event.at)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Chưa có cập nhật từ Giao Hàng Nhanh.</p>
              )}
            </div>
          ) : (
            // Chua co van don GHN: noi ro buoc tiep theo thay vi de trong
            <div className="min-w-0 self-center">
              <p className="font-display text-xl font-semibold italic text-foreground">
                {order.arrangementPhotoUrl ? "Bó hoa đã sẵn sàng" : "Đang chuẩn bị hoa"}
              </p>
              <p className="mt-2 max-w-md text-sm font-light leading-relaxed text-muted-foreground">
                {order.arrangementPhotoUrl
                  ? "Đây là bó hoa thật thợ hoa vừa cắm cho đơn của bạn. "
                  : "Thợ hoa chọn hoa tươi trong ngày cho đơn của bạn. "}
                {order.districtId
                  ? "Khi hoa gói xong, studio gửi qua Giao Hàng Nhanh và hành trình giao sẽ hiện ở đây."
                  : "Studio giao trực tiếp tới người nhận theo giờ bạn đã chọn."}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
