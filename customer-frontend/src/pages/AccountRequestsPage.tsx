import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Amphora,
  Ban,
  Check,
  Clock,
  Flower2,
  Gift,
  PackageCheck,
  PartyPopper,
  ShoppingBasket,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Notice, Spinner } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { api, type CustomRequest, type CustomRequestStatus } from "@/lib/api";
import { formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Bieu tuong theo kieu hoa (nhan tieng Viet luu tu trang dat hoa). */
const ARRANGEMENT_ICON: Record<string, LucideIcon> = {
  "Bó hoa": Flower2,
  "Hộp hoa": Gift,
  "Giỏ hoa": ShoppingBasket,
  "Bình hoa": Amphora,
  "Kệ hoa": PartyPopper,
  "Hoa cưới cầm tay": Sparkles,
};

/** Ten mau (viet thuong) -> o mau. Gom bang mau cua trang dat hoa va vai ten hay go tay. */
const SWATCH: Record<string, string> = {
  "đỏ": "#b3261e",
  "hồng": "#e8a0b4",
  "trắng": "#f3eee4",
  "kem": "#eadcc0",
  "vàng / cam": "#e5a93c",
  "vàng": "#e9c14c",
  "cam": "#e08a3c",
  "tím": "#8e6bb0",
  "xanh lá": "#7fa36b",
  "nhiều màu": "conic-gradient(#b3261e, #e5a93c, #7fa36b, #8e6bb0, #e8a0b4, #b3261e)",
};

/** Yeu cau can khach lam gi do len dau, roi den dang cho studio, cuoi cung la da xong. */
const STATUS_ORDER: Record<CustomRequestStatus, number> = {
  QUOTED: 0,
  NEW: 1,
  ORDERED: 2,
  REJECTED: 3,
  CANCELLED: 4,
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "Hom nay" theo gio Viet Nam, trung voi cach backend xet ngay. */
function todayVn(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

function titleOf(request: CustomRequest): string {
  const parts = [request.arrangement, request.sizeOption].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return request.occasion ? `Hoa ${request.occasion.toLowerCase()} làm riêng` : "Hoa làm riêng";
}

function colorLabels(colors: string | null): { labels: string[]; note: string | null } {
  if (!colors) return { labels: [], note: null };
  const [main, ...rest] = colors.split(" — ");
  return {
    labels: main.split(",").map((c) => c.trim()).filter(Boolean),
    note: rest.join(" — ").trim() || null,
  };
}

/**
 * Tai khoan > Yeu cau dat hoa. Khach xem bao gia cua studio va dong y bang cach cho
 * bo hoa vao gio roi dat nhu don thuong — gia trong gio chi de hien thi, server lay
 * dung gia studio da bao (OrderLineRequest.customRequestId).
 */
export default function AccountRequestsPage() {
  const { user } = useAuth();
  const { addCustomRequest } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { justCreated?: string; imageError?: string | null };

  const [requests, setRequests] = useState<CustomRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const userId = user?.id;

  useEffect(() => {
    if (userId == null) return;
    const controller = new AbortController();
    setError(null);
    api
      .listMyCustomRequests(0, 50, controller.signal)
      .then((page) => setRequests(page.content))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Không tải được yêu cầu.");
      });
    return () => controller.abort();
  }, [userId, reloadKey]);

  const sorted = useMemo(
    () =>
      requests
        ? [...requests].sort(
            (a, b) =>
              STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || Date.parse(b.createdAt) - Date.parse(a.createdAt),
          )
        : null,
    [requests],
  );
  const waitingForYou = requests?.filter((r) => r.status === "QUOTED").length ?? 0;

  function accept(request: CustomRequest) {
    addCustomRequest(request);
    navigate("/checkout");
  }

  async function cancel(request: CustomRequest) {
    if (!window.confirm(`Huỷ yêu cầu ${request.code}?`)) return;
    setActionError(null);
    try {
      await api.cancelCustomRequest(request.id);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Không huỷ được yêu cầu.");
    }
  }

  if (!user) return null;

  return (
    <AccountLayout
      eyebrow="Hoa làm riêng"
      title="Yêu cầu đặt hoa"
      description="Bó hoa bạn nhờ studio làm theo ý. Có báo giá thì đồng ý để đặt như đơn thường."
      action={
        <Button variant="outline" size="sm" asChild>
          <Link to="/dat-hoa-theo-yeu-cau">Gửi yêu cầu mới</Link>
        </Button>
      }
    >
      {state.justCreated ? (
        <Notice tone="success" className="mb-6">
          Đã gửi yêu cầu {state.justCreated}. Studio sẽ báo giá sớm, bạn xem lại trang này nhé.
        </Notice>
      ) : null}
      {state.imageError ? (
        <Notice tone="error" className="mb-6">
          Yêu cầu đã lưu nhưng chưa tải được ảnh mẫu: {state.imageError}
        </Notice>
      ) : null}
      {actionError ? (
        <Notice tone="error" className="mb-6">
          {actionError}
        </Notice>
      ) : null}

      {error ? (
        <ErrorState
          message={error}
          action={
            <Button variant="outline" size="md" onClick={() => setReloadKey((key) => key + 1)}>
              Thử lại
            </Button>
          }
        />
      ) : sorted === null ? (
        <Spinner label="Đang tải yêu cầu…" />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="Chưa có yêu cầu nào"
          description="Không thấy mẫu ưng ý trong danh mục? Tả bó hoa bạn muốn, studio báo giá cho bạn."
          action={
            <Button variant="primary" size="lg" asChild>
              <Link to="/dat-hoa-theo-yeu-cau">Đặt hoa theo yêu cầu →</Link>
            </Button>
          }
        />
      ) : (
        <>
          {waitingForYou > 0 ? (
            <p className="mb-6 flex items-center gap-2.5 text-sm text-foreground">
              <span className="relative flex size-2.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
              </span>
              {waitingForYou === 1
                ? "Studio đã báo giá 1 yêu cầu — xem và đồng ý để đặt hoa."
                : `Studio đã báo giá ${waitingForYou} yêu cầu — xem và đồng ý để đặt hoa.`}
            </p>
          ) : null}
          <ul className="space-y-6">
            {sorted.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onAccept={() => accept(request)}
                onCancel={() => void cancel(request)}
              />
            ))}
          </ul>
        </>
      )}
    </AccountLayout>
  );
}

function RequestCard({
  request,
  onAccept,
  onCancel,
}: {
  request: CustomRequest;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const colors = colorLabels(request.colors);
  const specs = [request.flowers, request.style, request.wrapping].filter(Boolean) as string[];
  const open = request.status === "NEW" || request.status === "QUOTED";
  const faded = request.status === "CANCELLED" || request.status === "REJECTED";

  return (
    <li className={cn("bg-surface", request.status === "QUOTED" && "ring-1 ring-accent/50")}>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-7">
        <RequestImage request={request} faded={faded} />

        <div className="min-w-0 flex-1">
          <p className="label-micro text-muted-foreground">
            {[request.occasion, `gửi ${formatDate(request.createdAt)}`].filter(Boolean).join(" · ")}
          </p>
          <h2
            className={cn(
              "mt-2 font-display text-[1.6rem] font-semibold italic leading-tight",
              faded ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {titleOf(request)}
          </h2>

          {/* Thong so bo hoa: hoa, mau, phong cach, giay goi, dieu can tranh */}
          {specs.length || colors.labels.length || colors.note || request.avoid ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-light text-foreground/90">
              {specs.length ? <span>{specs.join(" · ")}</span> : null}
              {colors.labels.length || colors.note ? (
                <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {colors.labels.map((c) => {
                    const swatch = SWATCH[c.toLowerCase()];
                    return (
                      <span key={c} className="inline-flex items-center gap-1.5">
                        {swatch ? (
                          <span
                            aria-hidden="true"
                            className="size-3 rounded-full ring-1 ring-border-strong/60"
                            style={{ background: swatch }}
                          />
                        ) : null}
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </span>
                    );
                  })}
                  {colors.note ? <span className="text-muted-foreground">{colors.note}</span> : null}
                </span>
              ) : null}
              {request.avoid ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Ban className="size-3.5 text-danger" aria-hidden="true" />
                  tránh {request.avoid.toLowerCase()}
                </span>
              ) : null}
            </div>
          ) : null}

          {request.description ? (
            <p className="mt-3 line-clamp-2 text-sm font-light italic leading-relaxed text-muted-foreground">
              “{request.description}”
            </p>
          ) : null}

          <Progress request={request} />
        </div>
      </div>

      {/* Khoi trang thai: viec tiep theo cua khach (hoac cua studio) */}
      <StatusPanel request={request} onAccept={onAccept} />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border px-5 py-3.5 text-xs text-muted-foreground sm:px-7">
        <span className="num">
          {[
            request.code,
            `Ngân sách ${formatPrice(request.budget)}`,
            request.desiredDate ? `cần ngày ${formatDate(request.desiredDate)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {open ? (
          <button
            type="button"
            onClick={onCancel}
            className="label-micro transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Huỷ yêu cầu
          </button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Ba buoc: Da gui -> Studio bao gia -> Dat hang. Bi tu choi dung o buoc 2; huy thi dung o
 * buoc ke tiep luc huy (chua bao gia -> buoc 2, da bao gia -> buoc 3).
 */
function Progress({ request }: { request: CustomRequest }) {
  const { status } = request;
  // So buoc da xong, va buoc bi dung (-1 = khong dung)
  const done = status === "ORDERED" ? 3 : status === "QUOTED" ? 2 : status === "CANCELLED" && request.quotedPrice != null ? 2 : 1;
  const stoppedAt = status === "REJECTED" || status === "CANCELLED" ? done : -1;
  const labels = ["Đã gửi", "Studio báo giá", "Đặt hàng"];
  if (stoppedAt >= 0) labels[stoppedAt] = status === "REJECTED" ? "Studio từ chối" : "Đã huỷ";

  return (
    <ol className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap sm:gap-x-2" aria-label="Tiến độ yêu cầu">
      {labels.map((label, index) => {
        const isDone = index < done;
        const stopped = index === stoppedAt;
        const current = stoppedAt < 0 && index === done;
        return (
          <li key={index} className="flex items-center gap-2 sm:min-w-0 sm:flex-1 sm:last:flex-none">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                stopped
                  ? "border-danger/70 text-danger"
                  : isDone
                    ? "border-accent bg-accent text-background"
                    : current
                      ? "border-accent text-accent"
                      : "border-border-strong text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {stopped ? (
                <X className="size-3" strokeWidth={3} />
              ) : isDone ? (
                <Check className="size-3" strokeWidth={3} />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-xs",
                stopped ? "text-danger" : isDone || current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {index < labels.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn("hidden h-px min-w-4 flex-1 sm:block", index + 1 < done ? "bg-accent" : "bg-border-strong/50")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function StatusPanel({ request, onAccept }: { request: CustomRequest; onAccept: () => void }) {
  switch (request.status) {
    case "NEW":
      return (
        <div className="mx-5 mb-5 flex items-start gap-3 bg-surface-raised/60 px-4 py-3.5 text-sm font-light text-muted-foreground sm:mx-7">
          <Clock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            <span className="text-foreground">Thợ hoa đang xem yêu cầu.</span> Studio báo giá trong giờ làm việc, có thể
            gọi hỏi thêm nếu cần.
          </span>
        </div>
      );

    case "QUOTED": {
      const price = request.quotedPrice ?? 0;
      const diff = price - request.budget;
      const pastDate = request.desiredDate != null && request.desiredDate < todayVn();
      return (
        <div className="mx-5 mb-5 border border-accent/40 bg-accent/10 p-5 sm:mx-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="label-micro text-accent">Studio báo giá</p>
              <p className="num mt-2 font-display text-[2.1rem] font-semibold italic leading-none text-foreground">
                {formatPrice(price)}
              </p>
              <p className="num mt-2 text-xs text-muted-foreground">
                {diff === 0
                  ? "Đúng bằng ngân sách của bạn"
                  : diff < 0
                    ? `Thấp hơn ngân sách ${formatPrice(-diff)}`
                    : `Cao hơn ngân sách ${formatPrice(diff)}`}
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={onAccept} className="shrink-0">
              Đồng ý &amp; đặt hoa →
            </Button>
          </div>
          {request.shopNote ? (
            <p className="mt-4 border-t border-accent/25 pt-4 text-sm font-light leading-relaxed text-foreground/90">
              <span className="text-accent">Thợ hoa nhắn: </span>
              {request.shopNote}
            </p>
          ) : null}
          {pastDate ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Ngày cần hoa ban đầu đã qua — bạn chọn ngày giao mới ở bước đặt hoa.
            </p>
          ) : null}
        </div>
      );
    }

    case "ORDERED":
      return (
        <div className="mx-5 mb-5 flex flex-col gap-3 bg-success/10 px-4 py-3.5 sm:mx-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2.5 text-sm text-foreground">
            <PackageCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
            Đã đặt hoa
            {request.quotedPrice != null ? (
              <span className="num text-muted-foreground">· {formatPrice(request.quotedPrice)}</span>
            ) : null}
          </p>
          {request.orderId != null ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/orders/${request.orderId}`}>Xem đơn {request.orderCode} →</Link>
            </Button>
          ) : null}
        </div>
      );

    case "REJECTED":
      return (
        <div className="mx-5 mb-5 flex flex-col gap-3 bg-danger/10 px-4 py-3.5 sm:mx-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-light text-foreground/90">
            <span className="text-danger">Studio chưa nhận được yêu cầu này. </span>
            {request.shopNote}
          </p>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link to="/dat-hoa-theo-yeu-cau">Gửi yêu cầu khác</Link>
          </Button>
        </div>
      );

    default:
      return (
        <p className="mx-5 mb-5 text-sm font-light text-muted-foreground sm:mx-7">Bạn đã huỷ yêu cầu này.</p>
      );
  }
}

/** Anh mau khach gui; khong co / tai hong thi hien bieu tuong kieu hoa. */
function RequestImage({ request, faded }: { request: CustomRequest; faded: boolean }) {
  const [broken, setBroken] = useState(false);
  const Icon = (request.arrangement && ARRANGEMENT_ICON[request.arrangement]) || Flower2;
  const src = request.referenceImageUrl ? resolveImageUrl(request.referenceImageUrl) : null;

  if (src && !broken) {
    return (
      <img
        src={src}
        alt="Ảnh mẫu bạn gửi"
        onError={() => setBroken(true)}
        className={cn("size-24 shrink-0 bg-surface-raised object-cover sm:size-28", faded && "opacity-50 grayscale")}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "hidden size-24 shrink-0 items-center justify-center bg-accent/10 sm:flex sm:size-28",
        faded && "bg-surface-raised",
      )}
    >
      <Icon className={cn("size-8", faded ? "text-muted-foreground" : "text-accent")} strokeWidth={1.25} />
    </span>
  );
}
