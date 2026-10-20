import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Amphora,
  Ban,
  CalendarClock,
  Flower2,
  Gift,
  Loader2,
  MessageSquareQuote,
  PartyPopper,
  Phone,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState, Notice, Skeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/shop/Pagination";
import { PageHeader } from "@/components/site/AdminShell";
import { InitialsAvatar } from "@/components/site/InitialsAvatar";
import { api, type CustomRequest, type CustomRequestStatus, type Page } from "@/lib/api";
import { formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type FilterKey = CustomRequestStatus | "ALL";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "NEW", label: "Chờ báo giá" },
  { key: "QUOTED", label: "Chờ khách đồng ý" },
  { key: "ORDERED", label: "Đã thành đơn" },
  { key: "ALL", label: "Tất cả" },
];

/** Mau cua trang thai: vien trai cua phieu + nhan trang thai. */
const STATUS_TONE: Record<CustomRequestStatus, { bar: string; pill: string }> = {
  NEW: { bar: "bg-accent", pill: "bg-accent/12 text-accent ring-accent/25" },
  QUOTED: { bar: "bg-info", pill: "bg-info/12 text-info ring-info/25" },
  ORDERED: { bar: "bg-success", pill: "bg-success/12 text-success ring-success/25" },
  REJECTED: { bar: "bg-danger/70", pill: "bg-danger/10 text-danger ring-danger/25" },
  CANCELLED: { bar: "bg-border-strong", pill: "bg-surface-raised text-muted-foreground ring-border" },
};

/** Bieu tuong theo kieu hoa khach chon (nhan tieng Viet tu trang dat hoa). */
const ARRANGEMENT_ICON: Record<string, LucideIcon> = {
  "Bó hoa": Flower2,
  "Hộp hoa": Gift,
  "Giỏ hoa": ShoppingBasket,
  "Bình hoa": Amphora,
  "Kệ hoa": PartyPopper,
  "Hoa cưới cầm tay": Sparkles,
};

/**
 * Ten mau (viet thuong) -> o mau. Gom bang mau cua trang khach va vai ten hay go tay o
 * yeu cau cu ("kem", "cam", "vang"...).
 */
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
  "xanh": "#6f9bc4",
  "nhiều màu": "conic-gradient(#b3261e, #e5a93c, #7fa36b, #8e6bb0, #e8a0b4, #b3261e)",
};

function swatchOf(label: string): string | undefined {
  return SWATCH[label.trim().toLowerCase()];
}

/** "Hom nay" theo gio Viet Nam, trung voi cach backend xet ngay. */
function todayVn(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function formatDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

const relative = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
function timeAgo(iso: string): string {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

/** Han can hoa: qua han / hom nay (do), ngay mai (vang), con lai (xam). */
function deadline(request: CustomRequest): { text: string; tone: string } | null {
  if (!request.desiredDate) return null;
  const open = request.status === "NEW" || request.status === "QUOTED";
  const days = daysBetween(todayVn(), request.desiredDate);
  const day = formatDay(request.desiredDate);
  if (!open) return { text: `Cần ngày ${day}`, tone: "text-muted-foreground" };
  if (days < 0) return { text: `Đã qua ngày ${day}`, tone: "text-danger" };
  if (days === 0) return { text: `Cần hôm nay · ${day}`, tone: "text-danger" };
  if (days === 1) return { text: `Cần ngày mai · ${day}`, tone: "text-warning" };
  return { text: `Cần ngày ${day} · còn ${days} ngày`, tone: "text-muted-foreground" };
}

/** "Hong, Trang — pastel" -> [Hong, Trang] + ghi chu "pastel". */
function parseColors(colors: string | null): { labels: string[]; note: string | null } {
  if (!colors) return { labels: [], note: null };
  const [main, ...rest] = colors.split(" — ");
  const labels = main.split(",").map((c) => c.trim()).filter(Boolean);
  return { labels, note: rest.join(" — ").trim() || null };
}

type Action = { kind: "quote" | "reject"; request: CustomRequest };

/**
 * Yeu cau dat hoa theo y khach, trinh bay nhu phieu viec cua tho hoa: bo hoa can lam, ngan
 * sach, han can hoa. Bao gia xong, khach dong y thi yeu cau thanh mot dong trong don hang
 * binh thuong (gia la gia da bao o day).
 */
export default function AdminCustomRequestsPage() {
  // ?status=ORDERED (vd. tu trang chi tiet don) thi mo san dung the loc do
  const [searchParams] = useSearchParams();
  const initial = searchParams.get("status");
  const [filter, setFilter] = useState<FilterKey>(
    FILTERS.some((f) => f.key === initial) ? (initial as FilterKey) : "NEW",
  );
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<CustomRequest> | null>(null);
  const [counts, setCounts] = useState<Partial<Record<FilterKey, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [action, setAction] = useState<Action | null>(null);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.listCustomRequests(filter === "ALL" ? null : filter, page, PAGE_SIZE));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Không tải được yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  // So yeu cau moi nhom cho the loc - hong thi chi mat con so, trang van dung
  const loadCounts = useCallback(async () => {
    const keys: FilterKey[] = ["NEW", "QUOTED", "ORDERED"];
    const results = await Promise.allSettled(keys.map((k) => api.listCustomRequests(k as CustomRequestStatus, 0, 1)));
    const next: Partial<Record<FilterKey, number>> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") next[keys[i]] = r.value.totalElements;
    });
    setCounts(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  function open(kind: Action["kind"], request: CustomRequest) {
    setAction({ kind, request });
    // Bao gia lan dau: goi y bang ngan sach cua khach
    setPrice(String(request.quotedPrice ?? request.budget));
    setNote(request.shopNote ?? "");
    setFormError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    setFormError(null);
    const amount = Number(price);
    if (action.kind === "quote" && (!Number.isFinite(amount) || amount < 50_000)) {
      setFormError("Giá báo tối thiểu 50.000₫.");
      return;
    }
    if (action.kind === "reject" && !note.trim()) {
      setFormError("Cho khách biết lý do.");
      return;
    }
    setSaving(true);
    try {
      if (action.kind === "quote") {
        await api.quoteCustomRequest(action.request.id, amount, note.trim() || null);
        setNotice({
          tone: "success",
          text: `Đã báo giá ${formatPrice(amount)} cho ${action.request.code}. Khách thấy ở Tài khoản › Yêu cầu đặt hoa.`,
        });
      } else {
        await api.rejectCustomRequest(action.request.id, note.trim());
        setNotice({ tone: "success", text: `Đã từ chối ${action.request.code}.` });
      }
      setAction(null);
      await Promise.all([load(), loadCounts()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  const quoteAmount = Number(price);
  const budget = action?.request.budget ?? 0;
  const diff = Number.isFinite(quoteAmount) && budget > 0 ? (quoteAmount - budget) / budget : null;

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Yêu cầu đặt hoa"
        description="Bó hoa khách nhờ studio làm riêng. Báo giá xong, khách đồng ý thì yêu cầu thành đơn hàng như bình thường."
      />

      {notice ? (
        <Notice tone={notice.tone} className="mt-6">
          {notice.text}
        </Notice>
      ) : null}

      {/* ---------- The loc kem so luong ---------- */}
      <div role="group" aria-label="Lọc yêu cầu" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const active = filter === item.key;
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setFilter(item.key);
                setPage(0);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[0.8125rem] transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-accent/60 bg-accent-soft text-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {item.label}
              {count != null ? (
                <span
                  className={cn(
                    "num inline-flex min-w-5 justify-center rounded-full px-1.5 text-[11px] font-medium",
                    item.key === "NEW" && count > 0
                      ? "bg-accent text-background"
                      : "bg-surface-raised text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorState
            message={error}
            action={
              <Button variant="outline" size="md" onClick={() => void load()}>
                Thử lại
              </Button>
            }
          />
        </div>
      ) : loading && !data ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : data && data.content.length === 0 ? (
        <div className="card mt-6">
          <EmptyState
            title={filter === "NEW" ? "Không còn yêu cầu nào chờ báo giá" : "Không có yêu cầu nào"}
            description="Khách gửi yêu cầu ở trang Đặt hoa theo yêu cầu của cửa hàng."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {data?.content.map((request) => (
            <RequestTicket
              key={request.id}
              request={request}
              onQuote={() => open("quote", request)}
              onReject={() => open("reject", request)}
            />
          ))}
        </ul>
      )}

      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex justify-end">
          <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} label="Phân trang yêu cầu" />
        </div>
      ) : null}

      {/* ---------- Bao gia / tu choi ---------- */}
      <Dialog open={action !== null} onOpenChange={(value) => !value && setAction(null)}>
        <DialogContent
          open={action !== null}
          title={action?.kind === "reject" ? `Từ chối ${action.request.code}?` : `Báo giá ${action?.request.code ?? ""}`}
          description={
            action?.kind === "quote"
              ? "Khách thấy giá và lời nhắn ở trang yêu cầu, đồng ý thì đặt hàng với đúng giá này."
              : "Khách thấy lời nhắn này ở trang yêu cầu của họ."
          }
        >
          {action ? (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-[var(--radius-sm)] bg-surface-raised px-3.5 py-3 text-[0.8125rem]">
              <span className="min-w-0 truncate text-foreground">{titleOf(action.request)}</span>
              <span className="num shrink-0 text-muted-foreground">
                Ngân sách <span className="font-medium text-foreground">{formatPrice(action.request.budget)}</span>
              </span>
            </div>
          ) : null}

          <form id="request-action-form" onSubmit={submit} noValidate className="space-y-4">
            {formError ? <Notice tone="error">{formError}</Notice> : null}
            {action?.kind === "quote" ? (
              <div>
                <Field id="quotePrice" label="Giá bó hoa (VND)" required>
                  {(props) => (
                    <Input
                      {...props}
                      type="number"
                      min="50000"
                      step="10000"
                      inputMode="numeric"
                      className="num"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                    />
                  )}
                </Field>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "Bằng ngân sách", value: budget },
                    { label: "+10%", value: Math.round((budget * 1.1) / 10_000) * 10_000 },
                    { label: "+20%", value: Math.round((budget * 1.2) / 10_000) * 10_000 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setPrice(String(option.value))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        quoteAmount === option.value
                          ? "border-accent/60 bg-accent-soft text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  {diff != null ? (
                    <span
                      className={cn(
                        "ml-auto text-xs",
                        diff <= 0 ? "text-success" : diff <= 0.15 ? "text-warning" : "text-danger",
                      )}
                    >
                      {diff <= 0
                        ? "Trong ngân sách của khách"
                        : `Cao hơn ngân sách ${Math.round(diff * 100)}% — nên giải thích trong lời nhắn`}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
            <Field
              id="quoteNote"
              label={action?.kind === "reject" ? "Lý do" : "Lời nhắn cho khách"}
              required={action?.kind === "reject"}
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={3}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={
                    action?.kind === "reject"
                      ? "Mùa này không nhập được mẫu đơn trắng…"
                      : "15 hồng kem Ecuador + lan hồ điệp trắng, giấy lụa kem, ruy băng satin."
                  }
                />
              )}
            </Field>
          </form>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setAction(null)}>
              Huỷ
            </Button>
            <Button
              type="submit"
              form="request-action-form"
              variant={action?.kind === "reject" ? "danger" : "primary"}
              size="md"
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {action?.kind === "reject" ? "Từ chối" : "Gửi báo giá"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Tieu de phieu: bo hoa can lam. Yeu cau cu (truoc khi co lua chon) dung dip tang. */
function titleOf(request: CustomRequest): string {
  const parts = [request.arrangement, request.sizeOption].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return request.occasion ? `Hoa ${request.occasion.toLowerCase()} làm riêng` : "Hoa làm riêng";
}

function RequestTicket({
  request,
  onQuote,
  onReject,
}: {
  request: CustomRequest;
  onQuote: () => void;
  onReject: () => void;
}) {
  const tone = STATUS_TONE[request.status];
  const due = deadline(request);
  const colors = parseColors(request.colors);
  const flowers = request.flowers ? request.flowers.split(",").map((f) => f.trim()).filter(Boolean) : [];
  const details = [
    request.style ? { label: "Phong cách", value: request.style } : null,
    request.wrapping ? { label: "Giấy gói", value: request.wrapping } : null,
  ].filter((d): d is { label: string; value: string } => d !== null);
  const open = request.status === "NEW" || request.status === "QUOTED";

  return (
    <li className="card relative overflow-hidden">
      {/* Vien trai theo trang thai: luot nhanh biet phieu nao con phai xu ly */}
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} />

      <div className="flex flex-col gap-5 p-5 pl-6 md:flex-row">
        <ReferenceImage request={request} />

        {/* ---- Bo hoa can lam ---- */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span
              className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tone.pill)}
            >
              {request.statusLabel}
            </span>
            {request.occasion ? (
              <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-muted-foreground">
                {request.occasion}
              </span>
            ) : null}
            <span className="num text-xs text-subtle-foreground">{request.code}</span>
          </div>

          <h2 className="mt-2.5 font-display text-[1.4rem] font-semibold italic leading-tight text-foreground">
            {titleOf(request)}
          </h2>

          <dl className="mt-4 space-y-2.5 text-[0.8125rem]">
            {flowers.length ? (
              <SpecRow label="Hoa">
                <span className="flex flex-wrap gap-1.5">
                  {flowers.map((f) => (
                    <span key={f} className="rounded-full border border-border px-2.5 py-0.5 text-foreground">
                      {f}
                    </span>
                  ))}
                </span>
              </SpecRow>
            ) : null}
            {colors.labels.length || colors.note ? (
              <SpecRow label="Màu">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {colors.labels.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1.5 text-foreground">
                      {swatchOf(c) ? (
                        <span
                          aria-hidden="true"
                          className="size-3.5 rounded-full ring-1 ring-border-strong"
                          style={{ background: swatchOf(c) }}
                        />
                      ) : null}
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </span>
                  ))}
                  {colors.note ? <span className="text-muted-foreground">{colors.note}</span> : null}
                </span>
              </SpecRow>
            ) : null}
            {details.map((d) => (
              <SpecRow key={d.label} label={d.label}>
                <span className="text-foreground">{d.value}</span>
              </SpecRow>
            ))}
            {request.avoid ? (
              <SpecRow label="Tránh">
                <span className="inline-flex items-center gap-1.5 text-danger">
                  <Ban className="size-3.5 shrink-0" aria-hidden="true" />
                  {request.avoid}
                </span>
              </SpecRow>
            ) : null}
          </dl>

          {request.description ? (
            <blockquote className="mt-4 flex gap-2.5 border-l-2 border-border-strong pl-3.5 text-sm leading-relaxed text-foreground/90">
              <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
              <span className="whitespace-pre-line">{request.description}</span>
            </blockquote>
          ) : null}

          {request.quotedPrice != null || request.shopNote ? (
            <div className="mt-4 rounded-[var(--radius-sm)] bg-info/8 px-3.5 py-2.5 text-[0.8125rem] ring-1 ring-inset ring-info/20">
              {request.quotedPrice != null ? (
                <p className="text-foreground">
                  <span className="num font-medium">Đã báo {formatPrice(request.quotedPrice)}</span>
                  {request.handledBy ? <span className="text-muted-foreground"> · @{request.handledBy}</span> : null}
                </p>
              ) : null}
              {request.shopNote ? <p className="mt-1 text-muted-foreground">{request.shopNote}</p> : null}
            </div>
          ) : null}
        </div>

        {/* ---- Ngan sach + han ---- */}
        <div className="flex shrink-0 flex-row items-end justify-between gap-4 md:w-52 md:flex-col md:items-end md:justify-start md:text-right">
          <div>
            <p className="text-xs text-muted-foreground">Ngân sách</p>
            <p className="num mt-0.5 font-display text-[1.75rem] font-semibold italic leading-none text-accent">
              {formatPrice(request.budget)}
            </p>
          </div>
          {due ? (
            <p className={cn("inline-flex items-center gap-1.5 text-xs md:mt-3", due.tone)}>
              <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
              {due.text}
            </p>
          ) : null}
        </div>
      </div>

      {/* ---- Khach + thao tac ---- */}
      <div className="flex flex-col gap-3 border-t border-border bg-surface-raised/40 px-5 py-3 pl-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
          <InitialsAvatar name={request.username} size="sm" />
          <span className="text-foreground">@{request.username}</span>
          {request.contactPhone ? (
            <a
              href={`tel:${request.contactPhone}`}
              className="num inline-flex items-center gap-1 text-muted-foreground hover:text-accent"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              {request.contactPhone}
            </a>
          ) : null}
          <span className="text-subtle-foreground" title={new Date(request.createdAt).toLocaleString("vi-VN")}>
            gửi {timeAgo(request.createdAt)}
          </span>
        </div>

        <div className="flex shrink-0 gap-2">
          {open ? (
            <>
              <Button variant="ghost" size="sm" onClick={onReject}>
                <Ban aria-hidden="true" />
                Từ chối
              </Button>
              <Button variant="primary" size="sm" onClick={onQuote}>
                {request.status === "NEW" ? "Báo giá" : "Sửa báo giá"}
              </Button>
            </>
          ) : null}
          {request.status === "ORDERED" && request.orderId != null ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/orders/${request.orderId}`}>Xem đơn {request.orderCode}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-start gap-3">
      <dt className="pt-0.5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Anh mau cua khach; khong co / tai hong thi hien bieu tuong kieu hoa thay vi o xam trong. */
function ReferenceImage({ request }: { request: CustomRequest }) {
  const [broken, setBroken] = useState(false);
  const Icon = (request.arrangement && ARRANGEMENT_ICON[request.arrangement]) || Flower2;
  const src = request.referenceImageUrl ? resolveImageUrl(request.referenceImageUrl) : null;

  if (!src || broken) {
    return (
      // Man hinh hep: bo o trong, nhuong cho noi dung
      <div className="hidden h-36 w-28 shrink-0 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed md:flex border-border-strong/70 text-subtle-foreground">
        <Icon className="size-6" aria-hidden="true" />
        <span className="px-2 text-center text-[11px] leading-tight">Không có ảnh mẫu</span>
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="group relative block h-36 w-28 shrink-0">
      <img
        src={src}
        alt={`Ảnh mẫu của ${request.code}`}
        onError={() => setBroken(true)}
        className="size-full rounded-[var(--radius-md)] bg-surface-raised object-cover ring-1 ring-border"
      />
      <span className="absolute inset-x-0 bottom-0 rounded-b-[var(--radius-md)] bg-black/55 py-1 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        Xem ảnh lớn
      </span>
    </a>
  );
}
