import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Ban,
  CalendarClock,
  ClipboardList,
  MessagesSquare,
  Sparkles,
  Coins,
  Flower2,
  Loader2,
  PackageCheck,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/site/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { AdminOverview } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Cac ky bao cao dung san — bam mot lan la ap dung, khong can chon ngay tay. */
const PRESETS = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
];

/** Ngay (yyyy-MM-dd) theo gio Viet Nam, cach day `days` ngay - khop voi cach backend xet ngay. */
function isoDaysAgo(days: number): string {
  return new Date(Date.now() + 7 * 3_600_000 - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Admin > Bang dieu khien. PHAN MO RONG ngoai SOS01-SOS10.
 *
 * CHI hien nhung chi so tinh duoc tu du lieu that cua du an.
 * Ton kho, doi tra, danh gia, tin nhan, thanh toan online deu KHONG co trong pham vi
 * nay nen khong dung o day — bay so 0 cho nhung thu khong ton tai chi gay hieu nham.
 */
export default function AdminOverviewPage() {
  const { role } = useAuth();

  const today = isoDaysAgo(0);
  const monthAgo = isoDaysAgo(29);

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  // Khoang ngay DA AP DUNG — chi doi khi bam "Ap dung" hoac chon ky dung san
  const [range, setRange] = useState({ from: monthAgo, to: today });

  const [data, setData] = useState<AdminOverview | null>(null);
  // Ky lien truoc cung do dai - de ghi "tang / giam bao nhieu %"
  const [previous, setPrevious] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .getAdminOverview(range.from, range.to, controller.signal)
      .then(setData)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Không tải được số liệu tổng quan.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    // Ky truoc: hong thi chi mat dong so sanh, cac chi so van hien
    const prev = previousRange(range.from, range.to);
    api
      .getAdminOverview(prev.from, prev.to, controller.signal)
      .then(setPrevious)
      .catch(() => {
        if (!controller.signal.aborted) setPrevious(null);
      });

    return () => controller.abort();
  }, [role, range]);

  function handleApply(event: FormEvent) {
    event.preventDefault();
    setRange({ from, to });
  }

  function applyPreset(days: number) {
    const next = { from: isoDaysAgo(days - 1), to: today };
    setFrom(next.from);
    setTo(next.to);
    setRange(next);
  }

  const activePreset = PRESETS.find(
    (preset) => range.to === today && range.from === isoDaysAgo(preset.days - 1),
  )?.days;

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Bảng điều khiển"
        description={
          <>
            Số liệu kinh doanh từ{" "}
            <span className="num text-foreground">{formatDate(range.from)}</span> đến{" "}
            <span className="num text-foreground">{formatDate(range.to)}</span>.
          </>
        }
        actions={
          <Button
            variant="outline"
            size="md"
            onClick={() => setRange({ ...range })}
            disabled={loading}
          >
            <RefreshCw className={cn(loading && "animate-spin")} aria-hidden="true" />
            Làm mới
          </Button>
        }
      />

      <TodayBoard reloadKey={range} />

      {/* ---------- Thanh chon ky bao cao ---------- */}
      <div className="card mt-6 flex flex-col gap-4 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Kỳ báo cáo dùng sẵn"
          className="inline-flex w-fit rounded-[var(--radius-sm)] bg-background p-1"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              aria-pressed={activePreset === preset.days}
              onClick={() => applyPreset(preset.days)}
              className={cn(
                "h-7 rounded-[5px] px-3 text-[0.8125rem] transition-colors",
                activePreset === preset.days
                  ? "bg-surface-raised font-medium text-foreground shadow-[var(--shadow-card)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleApply} className="flex flex-wrap items-center gap-2">
          <Label htmlFor="from" className="sr-only">
            Từ ngày
          </Label>
          <Input
            id="from"
            type="date"
            max={to}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="num w-auto"
          />
          <span aria-hidden="true" className="text-subtle-foreground">
            →
          </span>
          <Label htmlFor="to" className="sr-only">
            Đến ngày
          </Label>
          <Input
            id="to"
            type="date"
            min={from}
            max={today}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="num w-auto"
          />
          <Button type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Áp dụng
          </Button>
        </form>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorState
            message={error}
            action={
              <Button variant="outline" size="md" onClick={() => setRange({ ...range })}>
                Thử lại
              </Button>
            }
          />
        </div>
      ) : null}

      {!data && loading ? <OverviewSkeleton /> : null}

      {data ? (
        <div className={cn("transition-opacity", loading && "opacity-60")}>
          {/* ---------- Hang chi so chinh ---------- */}
          <section
            aria-label="Chỉ số chính"
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <KpiCard
              icon={Coins}
              label="Doanh thu"
              value={formatPrice(data.revenue)}
              hint="Không tính đơn đã huỷ"
              highlight
              delta={change(data.revenue, previous?.revenue)}
            />
            <KpiCard
              icon={Receipt}
              label="Số đơn"
              value={String(data.orderCount)}
              hint={`${data.deliveredCount} đơn đã giao xong`}
              delta={change(data.orderCount, previous?.orderCount)}
            />
            <KpiCard
              icon={ShoppingBag}
              label="Giá trị trung bình / đơn"
              value={formatPrice(data.averageOrderValue)}
              hint="Doanh thu chia số đơn hợp lệ"
              delta={change(data.averageOrderValue, previous?.averageOrderValue)}
            />
            <KpiCard
              icon={Ban}
              label="Đơn huỷ"
              value={String(data.cancelledCount)}
              hint={
                data.cancelledValue > 0
                  ? `Mất ${formatPrice(data.cancelledValue)} doanh thu`
                  : "Không có đơn nào bị huỷ"
              }
              tone={data.cancelledCount > 0 ? "danger" : undefined}
              // Don huy tang la xau: dao mau
              delta={change(data.cancelledCount, previous?.cancelledCount)}
              invertDelta
            />
          </section>

          {/* ---------- Bieu do + viec can xu ly ---------- */}
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-labelledby="revenue-heading" className="card min-w-0 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="revenue-heading" className="text-base text-foreground">
                    Doanh thu theo ngày
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Rê chuột lên cột để xem số liệu từng ngày
                  </p>
                </div>
                <p className="num text-xs text-muted-foreground">
                  {data.daily.filter((point) => point.orders > 0).length}/{data.daily.length} ngày
                  có đơn
                </p>
              </div>
              <RevenueChart daily={data.daily} />
            </section>

            <section aria-labelledby="todo-heading" className="card flex flex-col p-5">
              <div className="flex items-center justify-between">
                <h2 id="todo-heading" className="text-base text-foreground">
                  Đơn trong kỳ
                </h2>
                <span className="num rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {data.orderCount} đơn
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                <TodoRow
                  icon={ClipboardList}
                  label="Chờ xác nhận"
                  hint="Kiểm tra và xác nhận đơn"
                  value={data.pendingCount}
                  tone="warning"
                />
                <TodoRow
                  icon={Truck}
                  label="Đã xác nhận, chờ giao"
                  hint="Theo dõi tiến độ giao hoa"
                  value={data.confirmedCount}
                  tone="info"
                />
                <TodoRow
                  icon={PackageCheck}
                  label="Đã giao trong kỳ"
                  hint="Đơn hoàn tất"
                  value={data.deliveredCount}
                  tone="success"
                />
              </ul>

              <StatusBar data={data} />

              <Button variant="subtle" size="md" className="mt-auto w-full" asChild>
                <Link to="/admin/orders">
                  Mở danh sách đơn
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </section>
          </div>

          {/* ---------- Ban chay + quy mo cua hang ---------- */}
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-labelledby="top-heading" className="card min-w-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 pb-3 pt-5">
                <h2 id="top-heading" className="text-base text-foreground">
                  Sản phẩm bán chạy
                </h2>
                <Link
                  to="/admin/products"
                  className="inline-flex items-center gap-1 text-[0.8125rem] text-muted-foreground transition-colors hover:text-accent"
                >
                  Quản lý hoa
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>

              {data.topProducts.length === 0 ? (
                <p className="border-t border-border px-5 py-10 text-center text-sm text-muted-foreground">
                  Chưa có đơn nào trong kỳ này để xếp hạng.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[32rem]">
                    <caption className="sr-only">
                      Sản phẩm bán chạy nhất trong kỳ theo số lượng
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" className="w-12">
                          #
                        </th>
                        <th scope="col">Sản phẩm</th>
                        <th scope="col" className="text-right">
                          Đã bán
                        </th>
                        <th scope="col" className="text-right">
                          Doanh thu
                        </th>
                        <th scope="col" className="w-40">
                          Tỷ trọng
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((product, index) => {
                        const share = data.revenue > 0 ? product.revenue / data.revenue : 0;
                        return (
                          <tr key={product.productId}>
                            <td className="num text-subtle-foreground">{index + 1}</td>
                            <td className="max-w-0 truncate text-foreground">{product.name}</td>
                            <td className="num text-right text-muted-foreground">
                              {product.quantity} bó
                            </td>
                            <td className="num text-right text-foreground">
                              {formatPrice(product.revenue)}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
                                  <div
                                    className="h-full rounded-full bg-accent"
                                    style={{ width: `${Math.round(share * 100)}%` }}
                                  />
                                </div>
                                <span className="num w-9 text-right text-xs text-muted-foreground">
                                  {Math.round(share * 100)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section aria-labelledby="scale-heading" className="card p-5">
              <h2 id="scale-heading" className="text-base text-foreground">
                Quy mô cửa hàng
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Toàn bộ cửa hàng, không phụ thuộc kỳ báo cáo
              </p>
              <ul className="mt-4 space-y-2">
                <ScaleRow icon={Flower2} label="Sản phẩm" value={data.totalProducts} to="/admin/products" />
                <ScaleRow icon={Tags} label="Danh mục" value={data.totalCategories} to="/admin/categories" />
                {/* Nhan vien khong doc duoc danh sach tai khoan -> an dong nay */}
                {data.totalCustomers != null ? (
                  <ScaleRow icon={Users} label="Khách hàng" value={data.totalCustomers} />
                ) : null}
              </ul>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const TONES = {
  warning: "bg-warning/12 text-warning",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
  danger: "bg-danger/12 text-danger",
} as const;

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight = false,
  tone,
  delta,
  invertDelta = false,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
  tone?: keyof typeof TONES;
  /** Ti le thay doi so voi ky truoc (0.12 = +12%); null = khong so sanh duoc. */
  delta?: number | null;
  /** Chi so ma tang la xau (don huy): tang to do, giam to xanh. */
  invertDelta?: boolean;
}) {
  return (
    <div className={cn("card relative overflow-hidden p-5", highlight && "border-accent/40")}>
      {highlight ? (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8125rem] text-muted-foreground">{label}</p>
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
            tone ? TONES[tone] : highlight ? "bg-accent-soft text-accent" : "bg-surface-raised text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          "num mt-2 text-[1.75rem] font-semibold leading-none tracking-tight",
          highlight ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta != null ? <DeltaBadge value={delta} invert={invertDelta} /> : null}
        <p className="truncate text-subtle-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** "+12%" xanh / "-8%" do so voi ky truoc; |thay doi| duoi 0,5% ghi "Như kỳ trước". */
function DeltaBadge({ value, invert }: { value: number; invert: boolean }) {
  const flat = Math.abs(value) < 0.005;
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      title="So với kỳ liền trước cùng độ dài"
      className={cn(
        "num inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
        flat ? "bg-surface-raised text-muted-foreground" : good ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
      )}
    >
      {flat ? null : <Icon className="size-3" aria-hidden="true" />}
      {flat ? "Như kỳ trước" : `${Math.abs(Math.round(value * 100))}%`}
    </span>
  );
}

/** Mot dong trong khoi "Can xu ly" — bam vao mo danh sach don. */
function TodoRow({
  icon: Icon,
  label,
  hint,
  value,
  tone,
}: {
  icon: typeof ClipboardList;
  label: string;
  hint: string;
  value: number;
  tone: keyof typeof TONES;
}) {
  return (
    <li>
      <Link
        to="/admin/orders"
        className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-hover"
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
            TONES[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] text-foreground">{label}</span>
          <span className="block text-xs text-subtle-foreground">{hint}</span>
        </span>
        <span className="num shrink-0 text-lg font-semibold text-foreground">{value}</span>
      </Link>
    </li>
  );
}

/** Thanh ti le trang thai don trong ky — nhin mot cai la biet don dang don o dau. */
function StatusBar({ data }: { data: AdminOverview }) {
  const parts = [
    { label: "Chờ xác nhận", value: data.pendingCount, className: "bg-warning" },
    { label: "Đã xác nhận", value: data.confirmedCount, className: "bg-info" },
    { label: "Đã giao", value: data.deliveredCount, className: "bg-success" },
    { label: "Đã huỷ", value: data.cancelledCount, className: "bg-danger" },
  ];
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total === 0) return <div className="mb-4" />;

  return (
    <div className="mb-5 mt-5">
      <p className="label-micro text-subtle-foreground">Tỷ lệ trạng thái</p>
      <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <div
              key={part.label}
              className={part.className}
              style={{ width: `${(part.value / total) * 100}%` }}
              title={`${part.label}: ${part.value}`}
            />
          ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className={cn("size-2 rounded-full", part.className)} />
            {part.label}
            <span className="num ml-auto text-foreground">{part.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScaleRow({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Flower2;
  label: string;
  value: number;
  to?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-raised text-muted-foreground"
      >
        <Icon className="size-4" />
      </span>
      <span className="flex-1 text-[0.8125rem] text-muted-foreground">{label}</span>
      <span className="num text-lg font-semibold text-foreground">{value}</span>
      {to ? <ArrowRight className="size-3.5 text-subtle-foreground" aria-hidden="true" /> : null}
    </>
  );
  const className =
    "flex items-center gap-3 rounded-[var(--radius-sm)] border border-border px-3 py-2.5";
  return (
    <li>
      {to ? (
        <Link
          to={to}
          className={cn(className, "transition-colors hover:border-border-strong hover:bg-surface-hover")}
        >
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

/**
 * Bieu do cot doanh thu theo ngay — SVG thuan, khong keo them thu vien.
 * Co luoi ngang + nhan truc tung, re chuot hien o so lieu cua ngay do.
 *
 * Kem mot <table> chi danh cho trinh doc man hinh: hinh ve khong doc duoc,
 * nhung so lieu thi van phai tiep can duoc.
 */
function RevenueChart({ daily }: { daily: AdminOverview["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...daily.map((point) => point.revenue), 0);

  if (daily.length === 0 || max === 0) {
    return (
      <div className="mt-5 flex h-56 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-border text-sm text-muted-foreground">
        Chưa có doanh thu nào trong kỳ này.
      </div>
    );
  }

  const ceiling = niceCeiling(max);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ceiling * ratio);
  const barGap = daily.length > 60 ? 1 : daily.length > 20 ? 2 : 4;
  const hovered = hover !== null ? daily[hover] : null;

  return (
    <figure className="mt-5">
      <div className="flex gap-3">
        {/* Nhan truc tung */}
        <div
          aria-hidden="true"
          className="num flex h-56 shrink-0 flex-col justify-between text-right text-[0.6875rem] text-subtle-foreground"
        >
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {formatCompact(tick)}
            </span>
          ))}
        </div>

        <div className="relative h-56 min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
          {/* Luoi ngang */}
          <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span
                key={tick}
                className={cn("block h-px", tick === 0 ? "bg-border-strong" : "bg-border")}
              />
            ))}
          </div>

          {/* Cac cot */}
          <div
            role="img"
            aria-label={`Biểu đồ doanh thu theo ngày, cao nhất ${formatPrice(max)}`}
            className="absolute inset-0 flex items-end"
            style={{ gap: `${barGap}px` }}
          >
            {daily.map((point, index) => (
              <div
                key={point.date}
                onMouseEnter={() => setHover(index)}
                className="flex h-full min-w-0 flex-1 items-end"
              >
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-colors",
                    hover === index ? "bg-accent-strong" : "bg-accent/75",
                    point.revenue > 0 && "min-h-0.5",
                  )}
                  style={{ height: `${(point.revenue / ceiling) * 100}%` }}
                />
              </div>
            ))}
          </div>

          {/* O so lieu khi re chuot */}
          {hovered && hover !== null ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-2 z-10 w-40 -translate-x-1/2 rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-2 shadow-[var(--shadow-pop)]"
              style={{
                left: `clamp(5rem, ${((hover + 0.5) / daily.length) * 100}%, calc(100% - 5rem))`,
              }}
            >
              <p className="num text-xs text-muted-foreground">{formatDate(hovered.date)}</p>
              <p className="num mt-0.5 text-sm font-semibold text-foreground">
                {formatPrice(hovered.revenue)}
              </p>
              <p className="num text-xs text-muted-foreground">{hovered.orders} đơn</p>
            </div>
          ) : null}
        </div>
      </div>

      <figcaption className="num mt-2 flex justify-between pl-14 text-[0.6875rem] text-subtle-foreground">
        <span>{formatDate(daily[0].date)}</span>
        <span>Cao nhất {formatPrice(max)}</span>
        <span>{formatDate(daily[daily.length - 1].date)}</span>
      </figcaption>

      <table className="sr-only">
        <caption>Doanh thu theo ngày</caption>
        <thead>
          <tr>
            <th scope="col">Ngày</th>
            <th scope="col">Doanh thu</th>
            <th scope="col">Số đơn</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDate(point.date)}</th>
              <td>{formatPrice(point.revenue)}</td>
              <td>{point.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="card p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-56 w-full" />
        </div>
        <div className="card space-y-2 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

/** Lam tron tran truc tung len so "dep" (1, 2, 2.5, 5 x 10^n) de nhan truc de doc. */
/** Ky lien truoc cung so ngay, ket thuc ngay truoc from. */
function previousRange(from: string, to: string): { from: string; to: string } {
  const start = Date.parse(from);
  const days = Math.round((Date.parse(to) - start) / 86_400_000) + 1;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: iso(start - days * 86_400_000), to: iso(start - 86_400_000) };
}

/** Ti le thay doi; ky truoc bang 0 thi khong so duoc (null). */
function change(now: number, before: number | undefined): number | null {
  if (before == null || before === 0) return null;
  return (now - before) / before;
}

/** 20000000 -> "20tr", 1500000 -> "1,5tr", 500000 -> "500k" - cho truc bieu do. */
function formatCompact(value: number): string {
  if (value === 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

/** "Chao buoi sang" theo gio Viet Nam. */
function greeting(): string {
  const hour = new Date(Date.now() + 7 * 3_600_000).getUTCHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

/**
 * Viec hom nay: nhung con so khong phu thuoc ky bao cao, bam vao mo dung danh sach.
 * Moi nguon goi rieng (order-service, yeu cau dat hoa, chat-service): nguon nao hong thi
 * o do hien "—", cac o khac van dung.
 */
function TodayBoard({ reloadKey }: { reloadKey: unknown }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Record<string, number> | null>(null);
  const [requests, setRequests] = useState<number | null>(null);
  const [chats, setChats] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.orderStatusCounts(controller.signal).then(setOrders).catch(() => setOrders(null));
    api
      .listCustomRequests("NEW", 0, 1, controller.signal)
      .then((page) => setRequests(page.totalElements))
      .catch(() => setRequests(null));
    api
      .chatSummary(controller.signal)
      .then((summary) => setChats(summary.waitingStaff))
      .catch(() => setChats(null));
    return () => controller.abort();
  }, [reloadKey]);

  const tiles: {
    icon: typeof Coins;
    label: string;
    hint: string;
    value: number | null;
    to: string;
    tone: keyof typeof TONES;
  }[] = [
    {
      icon: CalendarClock,
      label: "Giao hôm nay",
      hint: "Đơn chưa xong phải giao trong ngày",
      value: orders?.DUE_TODAY ?? null,
      to: "/admin/orders?view=TODAY",
      tone: "warning",
    },
    {
      icon: ClipboardList,
      label: "Chờ xác nhận",
      hint: "Đơn mới cần gọi xác nhận",
      value: orders?.PENDING ?? null,
      to: "/admin/orders?view=TODO",
      tone: "info",
    },
    {
      icon: Sparkles,
      label: "Yêu cầu chờ báo giá",
      hint: "Hoa làm riêng khách vừa gửi",
      value: requests,
      to: "/admin/requests",
      tone: "success",
    },
    {
      icon: MessagesSquare,
      label: "Khách chờ trả lời",
      hint: "Cuộc chat đang đợi nhân viên",
      value: chats,
      to: "/admin/chat",
      tone: "danger",
    },
  ];
  const total = tiles.reduce((sum, t) => sum + (t.value ?? 0), 0);
  const name = user?.displayName || user?.fullName || user?.username || "";

  return (
    <section aria-labelledby="today-heading" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today-heading" className="text-base text-foreground">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h2>
        <p className="text-xs text-muted-foreground">
          {total > 0 ? (
            <>
              Hôm nay có <span className="num font-medium text-foreground">{total}</span> việc đang chờ
            </>
          ) : (
            "Không có việc nào đang chờ — mọi thứ đã xong"
          )}
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((tile) => {
          const busy = (tile.value ?? 0) > 0;
          return (
            <li key={tile.label} className="min-w-0">
              <Link
                to={tile.to}
                className={cn(
                  "group card flex h-full flex-col gap-3 p-4 transition-colors hover:border-border-strong hover:bg-surface-hover",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  busy && "border-border-strong",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
                      busy ? TONES[tile.tone] : "bg-surface-raised text-subtle-foreground",
                    )}
                  >
                    <tile.icon className="size-4" />
                  </span>
                  <span
                    className={cn(
                      "num text-[1.75rem] font-semibold leading-none",
                      busy ? "text-foreground" : "text-subtle-foreground",
                    )}
                  >
                    {tile.value ?? "—"}
                  </span>
                </span>
                <span className="flex items-end justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] font-medium text-foreground">{tile.label}</span>
                    <span className="mt-0.5 hidden text-xs text-subtle-foreground sm:block">{tile.hint}</span>
                  </span>
                  <ArrowRight
                    className="mb-0.5 size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function niceCeiling(value: number): number {
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * base) return step * base;
  }
  return 10 * base;
}

/** yyyy-mm-dd -> dd/mm/yyyy. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
