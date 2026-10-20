import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarClock, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/AdminShell";
import { EmptyState, ErrorState, Notice, TableRowSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/shop/Pagination";
import { ORDER_STATUS_LABELS, OrderStatusBadge, selectableStatuses } from "@/components/shop/OrderStatusBadge";
import { api, type Order, type Page } from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const OPEN = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPING"];

type ViewKey = "TODO" | "SHIPPING" | "DELIVERED" | "CANCELLED" | "ALL" | "TODAY";

/** Cac the loc. "Giao hom nay" = don chua xong co ngay giao la hom nay. */
const VIEWS: { key: ViewKey; label: string; status: string[]; today?: boolean }[] = [
  { key: "TODO", label: "Cần xử lý", status: ["PENDING", "CONFIRMED", "PREPARING"] },
  { key: "SHIPPING", label: "Đang giao", status: ["SHIPPING"] },
  { key: "DELIVERED", label: "Đã giao", status: ["DELIVERED"] },
  { key: "CANCELLED", label: "Đã huỷ", status: ["CANCELLED"] },
  { key: "ALL", label: "Tất cả", status: [] },
];
const TODAY_VIEW = { key: "TODAY" as const, label: "Giao hôm nay", status: OPEN, today: true };

/** "Hom nay" theo gio Viet Nam, trung voi cach backend xet ngay giao. */
function todayVn(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/** Ngay giao + do gap: qua han do, hom nay vang, ngay mai xanh. Don da xong chi ghi ngay. */
function delivery(order: Order): { text: string; tone: string } {
  if (!order.deliveryDate) return { text: "Sớm nhất", tone: "text-muted-foreground" };
  const [, m, d] = order.deliveryDate.split("-");
  const short = `${d}/${m}`;
  if (!OPEN.includes(order.status)) return { text: short, tone: "text-muted-foreground" };
  const days = Math.round((Date.parse(order.deliveryDate) - Date.parse(todayVn())) / 86_400_000);
  if (days < 0) return { text: `Quá hạn · ${short}`, tone: "text-danger" };
  if (days === 0) return { text: `Hôm nay`, tone: "text-warning" };
  if (days === 1) return { text: `Ngày mai`, tone: "text-info" };
  return { text: short, tone: "text-foreground" };
}

/** Buoc ke tiep hop le (bo qua huy) - nut chuyen nhanh tren tung dong. */
function nextStatus(order: Order): string | null {
  const options = selectableStatuses(order).filter((s) => s !== "CANCELLED" && s !== order.status);
  return options[0] ?? null;
}

/**
 * Quan ly don hang (ADMIN / nhan vien) — PHAN MO RONG ngoai SOS01-SOS10.
 * Loc + tim kiem chay o server (GET /orders?status=&q=&deliveryDate=), nen dung tren moi
 * trang chu khong chi 10 don dang xem. Doi buoc nhanh ngay tren dong; huy / nhay coc o
 * trang chi tiet.
 */
export default function AdminOrdersPage() {
  // ?view=TODAY (vd. tu Bang dieu khien) thi mo san dung the loc do
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view");
  const [view, setView] = useState<ViewKey>(
    initialView === "TODAY" || VIEWS.some((v) => v.key === initialView) ? (initialView as ViewKey) : "TODO",
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Page<Order> | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Go tim: doi 300ms sau lan go cuoi moi goi server
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const current = view === "TODAY" ? TODAY_VIEW : VIEWS.find((v) => v.key === view)!;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await api.listOrders(page, PAGE_SIZE, undefined, {
          // Dang tim kiem thi tim trong moi trang thai, tranh "khong thay don" vi dang o the khac
          status: search ? [] : current.status,
          q: search,
          deliveryDate: !search && "today" in current && current.today ? todayVn() : undefined,
        }),
      );
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Không tải được danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [page, search, current]);

  const loadCounts = useCallback(async () => {
    try {
      setCounts(await api.orderStatusCounts());
    } catch {
      setCounts(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  function countOf(key: ViewKey): number | null {
    if (!counts) return null;
    if (key === "TODAY") return counts.DUE_TODAY ?? 0;
    if (key === "ALL") return Object.entries(counts).reduce((sum, [k, n]) => (k === "DUE_TODAY" ? sum : sum + n), 0);
    return (VIEWS.find((v) => v.key === key)?.status ?? []).reduce((sum, s) => sum + (counts[s] ?? 0), 0);
  }

  async function advance(order: Order, status: string) {
    setUpdatingId(order.id);
    setNotice(null);
    try {
      await api.updateOrderStatus(order.id, status);
      setNotice({
        tone: "success",
        text: `Đơn ${order.code} chuyển sang "${ORDER_STATUS_LABELS[status]?.label ?? status}".`,
      });
      await Promise.all([load(), loadCounts()]);
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Không cập nhật được trạng thái.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  function choose(key: ViewKey) {
    setView(key);
    setPage(0);
    setQuery("");
    setSearch("");
  }

  const dueToday = countOf("TODAY");

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Đơn hàng"
        description="Đơn cần xử lý hiện trước. Bấm nút bước kế tiếp ngay trên dòng, hoặc mở đơn để huỷ, tạo vận đơn, gửi ảnh bó hoa."
      />

      {notice ? (
        <Notice tone={notice.tone} className="mt-6">
          {notice.text}
        </Notice>
      ) : null}

      {/* ---------- Loc + tim ---------- */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label="Lọc đơn hàng" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={view === "TODAY" && !search}
            onClick={() => choose("TODAY")}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[0.8125rem] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              view === "TODAY" && !search
                ? "border-warning/60 bg-warning/15 text-foreground"
                : "border-warning/30 text-warning hover:border-warning/60",
            )}
          >
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Giao hôm nay
            {dueToday != null ? (
              <span
                className={cn(
                  "num min-w-5 rounded-full px-1.5 text-center text-[11px] font-medium",
                  dueToday > 0 ? "bg-warning text-background" : "bg-surface-raised text-muted-foreground",
                )}
              >
                {dueToday}
              </span>
            ) : null}
          </button>
          <span aria-hidden="true" className="mx-1 hidden w-px self-stretch bg-border sm:block" />
          {VIEWS.map((v) => {
            const active = view === v.key && !search;
            const n = countOf(v.key);
            return (
              <button
                key={v.key}
                type="button"
                aria-pressed={active}
                onClick={() => choose(v.key)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[0.8125rem] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "border-accent/60 bg-accent-soft text-foreground"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {v.label}
                {n != null ? (
                  <span
                    className={cn(
                      "num min-w-5 rounded-full px-1.5 text-center text-[11px] font-medium",
                      v.key === "TODO" && n > 0 ? "bg-accent text-background" : "bg-surface-raised text-muted-foreground",
                    )}
                  >
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label className="relative block w-full sm:max-w-sm xl:w-72 xl:shrink-0">
          <span className="sr-only">Tìm đơn</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Mã đơn, người nhận, SĐT, tài khoản…"
            className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-9 text-[0.8125rem] text-foreground placeholder:text-subtle-foreground focus:border-accent/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Xoá tìm kiếm</span>
            </button>
          ) : null}
        </label>
      </div>

      <section aria-labelledby="order-list-heading" className="card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <h2 id="order-list-heading" className="text-sm text-foreground">
            {search ? (
              <>
                Kết quả cho <span className="text-accent">“{search}”</span>
              </>
            ) : (
              current.label
            )}
          </h2>
          {data ? (
            <span className="num flex items-center gap-2 text-xs text-muted-foreground">
              {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              {data.totalElements} đơn
            </span>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[60rem]">
            <caption className="sr-only">
              Danh sách đơn hàng: bó hoa, ngày giao, người nhận, tổng tiền, trạng thái
            </caption>
            <thead>
              <tr>
                <th scope="col">Đơn</th>
                <th scope="col">Giao</th>
                <th scope="col">Người nhận</th>
                <th scope="col" className="text-right">
                  Tổng tiền
                </th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="text-right">
                  Bước tiếp
                </th>
              </tr>
            </thead>
            <tbody className={cn(loading && data && "opacity-60 transition-opacity")}>
              {loading && !data
                ? Array.from({ length: 5 }).map((_, index) => <TableRowSkeleton key={index} columns={6} />)
                : data?.content.map((order) => {
                    const due = delivery(order);
                    const next = nextStatus(order);
                    const first = order.items[0];
                    const more = order.items.length - 1;
                    const time = order.deliveryTimeLabel ?? order.timeSlotLabel;
                    return (
                      <tr key={order.id} className={cn(order.status === "CANCELLED" && "opacity-60")}>
                        <td>
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveImageUrl(first?.imageUrl)}
                              alt=""
                              onError={(event) => {
                                const img = event.currentTarget;
                                if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                              }}
                              className="size-11 shrink-0 rounded-[var(--radius-sm)] bg-surface-raised object-cover ring-1 ring-border"
                            />
                            <div className="min-w-0">
                              <Link
                                to={`/orders/${order.id}`}
                                className="block max-w-64 truncate font-medium text-foreground transition-colors hover:text-accent"
                              >
                                {first?.productName ?? "Đơn hàng"}
                                {more > 0 ? <span className="font-normal text-muted-foreground"> +{more}</span> : null}
                              </Link>
                              <span className="num block text-xs text-subtle-foreground">{order.code}</span>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <span className={cn("block text-[0.8125rem] font-medium", due.tone)}>{due.text}</span>
                          {time && OPEN.includes(order.status) ? (
                            <span className="num block text-xs text-muted-foreground">{time}</span>
                          ) : null}
                        </td>
                        <td>
                          <span className="block max-w-48 truncate text-foreground">{order.customerName}</span>
                          <span className="num block text-xs text-subtle-foreground">
                            {order.phone}
                            {order.senderName ? " · quà tặng" : order.username ? ` · @${order.username}` : ""}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap text-right">
                          <span className="font-medium text-foreground">{formatPrice(order.total)}</span>
                          <span
                            className={cn(
                              "block text-xs",
                              order.paymentStatus === "PAID"
                                ? "text-success"
                                : order.paymentStatus === "REFUND_PENDING"
                                  ? "text-danger"
                                  : "text-subtle-foreground",
                            )}
                          >
                            {order.paymentMethod === "COD" ? "COD" : order.paymentMethodLabel} ·{" "}
                            {order.paymentStatusLabel}
                          </span>
                        </td>
                        <td>
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td>
                          <div className="flex justify-end">
                            {next ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingId !== null}
                                onClick={() => void advance(order, next)}
                                className="whitespace-nowrap"
                              >
                                {updatingId === order.id ? (
                                  <Loader2 className="animate-spin" aria-hidden="true" />
                                ) : (
                                  <ArrowRight aria-hidden="true" />
                                )}
                                {ORDER_STATUS_LABELS[next]?.label ?? next}
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/orders/${order.id}`}>Xem đơn</Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        {error ? (
          <div className="border-t border-border p-5">
            <ErrorState
              message={error}
              action={
                <Button variant="outline" size="md" onClick={() => void load()}>
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : null}

        {!loading && data?.content.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState
              title={
                search
                  ? "Không tìm thấy đơn nào"
                  : view === "TODAY"
                    ? "Hôm nay không còn đơn nào phải giao"
                    : view === "TODO"
                      ? "Không còn đơn nào cần xử lý"
                      : "Không có đơn nào"
              }
              description={
                search
                  ? "Thử mã đơn đầy đủ, một phần tên người nhận hoặc số điện thoại."
                  : "Khi khách đặt hoa ở cửa hàng, đơn sẽ xuất hiện ở đây."
              }
            />
          </div>
        ) : null}

        {data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <span className="num text-xs text-muted-foreground">
              Trang {data.number + 1} / {data.totalPages}
            </span>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} label="Phân trang đơn hàng" />
          </div>
        ) : null}
      </section>
    </div>
  );
}
