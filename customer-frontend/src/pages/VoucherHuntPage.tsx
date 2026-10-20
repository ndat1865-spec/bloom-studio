import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { VoucherTicket } from "@/components/shop/VoucherTicket";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Notice, Spinner } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api, type HuntVoucher, type MyVoucher } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Trang San voucher (kieu Shopee): moi ma chung dang chay cua studio.
 *  - Ma san (claimRequired): bam Luu thi ma vao vi, so luot luu co han, het la thoi.
 *  - Ma chung binh thuong: co san trong vi, chi hien de khach biet dang co uu dai gi.
 * Khach chua dang nhap van xem duoc; bam Luu moi dua sang trang dang nhap roi quay lai day.
 */

type Filter = "ALL" | "CLAIM" | "READY" | "UPCOMING";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "CLAIM", label: "Mã săn" },
  { value: "READY", label: "Có sẵn trong ví" },
  { value: "UPCOMING", label: "Sắp mở" },
];

function matches(v: HuntVoucher, filter: Filter): boolean {
  if (filter === "CLAIM") return v.claimRequired && v.state !== "UPCOMING";
  if (filter === "READY") return v.state === "READY" || v.state === "CLAIMED";
  if (filter === "UPCOMING") return v.state === "UPCOMING";
  return true;
}

/** Doi ma tren trang san sang dang MyVoucher de dung lai ve VoucherTicket. */
function asTicket(v: HuntVoucher): MyVoucher {
  const status: MyVoucher["status"] =
    v.state === "UPCOMING"
      ? "NOT_STARTED"
      : v.state === "SOLD_OUT"
        ? "USED_UP"
        : v.state === "USED"
          ? "ALREADY_USED"
          : "USABLE";
  return {
    code: v.code,
    description: v.description,
    type: v.type,
    value: v.value,
    maxDiscount: v.maxDiscount,
    minOrderValue: v.minOrderValue,
    startDate: v.startDate,
    endDate: v.endDate,
    personal: false,
    status,
    reason: null,
    discount: 0,
  };
}

function formatDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

export default function VoucherHuntPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<HuntVoucher[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Tai lai khi doi tai khoan: ma "da luu" la cua tung nguoi
  const userId = user?.id;

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    api
      .listHuntVouchers(controller.signal)
      .then(setVouchers)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Không tải được danh sách voucher.");
      });
    return () => controller.abort();
  }, [userId, reloadKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function claim(code: string) {
    if (!user) {
      navigate("/login", { state: { from: "/voucher" } });
      return;
    }
    setClaiming(code);
    try {
      const result = await api.claimVoucher(code);
      setVouchers((list) =>
        (list ?? []).map((v) =>
          v.code === result.code
            ? { ...v, state: "CLAIMED", claimedPercent: result.claimedPercent ?? v.claimedPercent }
            : v,
        ),
      );
      setNotice({
        tone: "success",
        text: result.alreadyClaimed
          ? `Mã ${result.code} đã có trong ví của bạn.`
          : `Đã lưu mã ${result.code} vào ví. Mã sẽ hiện ở bước đặt hoa.`,
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Không lưu được mã, thử lại sau.",
      });
      // Het luot / ma vua tat: tai lai de ve hien dung trang thai
      if (err instanceof ApiError && (err.status === 409 || err.status === 400 || err.status === 404)) {
        setReloadKey((key) => key + 1);
      }
    } finally {
      setClaiming(null);
    }
  }

  const all = vouchers ?? [];
  const shown = all.filter((v) => matches(v, filter));
  const claimableCount = all.filter((v) => v.state === "CLAIMABLE").length;

  return (
    <div className="shell page-pad">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <div>
          <p className="label-micro text-accent">Ưu đãi · Số lượng có hạn</p>
          <h1 className="display-section mt-4 text-foreground">Săn voucher</h1>
          <span aria-hidden="true" className="mt-5 block h-px w-28 bg-accent" />
        </div>

        <p className="max-w-md text-sm font-light leading-relaxed text-muted-foreground lg:pb-1.5 lg:text-right">
          Bấm <span className="text-foreground">Lưu</span> để cất mã vào ví — mỗi mã chỉ có một số lượt,
          hết là thôi. Mã đã lưu tự hiện ở bước đặt hoa, mỗi đơn dùng một mã.{" "}
          {user ? (
            <Link to="/tai-khoan/ma-giam-gia" className="text-accent hover:text-accent-strong">
              Xem ví mã của tôi
            </Link>
          ) : (
            <Link to="/login" state={{ from: "/voucher" }} className="text-accent hover:text-accent-strong">
              Đăng nhập để lưu mã
            </Link>
          )}
        </p>
      </header>

      <div className="mt-9 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Lọc voucher" className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                filter === option.value
                  ? "border-accent bg-accent text-background"
                  : "border-border-strong text-muted-foreground hover:border-accent hover:text-foreground",
              )}
            >
              {option.label}
              {vouchers ? (
                <span className="num ml-1.5 opacity-70">{all.filter((v) => matches(v, option.value)).length}</span>
              ) : null}
            </button>
          ))}
        </div>
        {claimableCount > 0 ? (
          <p className="text-xs font-light text-muted-foreground">
            Còn <span className="num text-accent">{claimableCount}</span> mã chờ bạn lưu
          </p>
        ) : null}
      </div>

      {/* Thong bao ket qua bam Luu: noi o day man hinh de luoi ve khong bi day xuong */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        {notice ? (
          // Notice co nen trong suot nhat - lot them nen dac de khong nhin xuyen ve ben duoi
          <div className="pointer-events-auto bg-background shadow-lg">
            <Notice tone={notice.tone}>{notice.text}</Notice>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
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
          <Spinner label="Đang tải voucher…" />
        ) : shown.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? "Chưa có chương trình nào" : "Không có mã ở mục này"}
            description={
              all.length === 0
                ? "Studio chưa mở đợt voucher mới. Quay lại sau nhé — mã thường mở vào dịp lễ."
                : "Thử xem mục khác."
            }
            action={
              all.length === 0 ? (
                <Button variant="primary" size="lg" asChild>
                  <Link to="/products">Xem hoa đang bán</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {shown.map((v) => (
              <li key={v.code}>
                <VoucherTicket
                  voucher={asTicket(v)}
                  stamp={v.state === "UPCOMING" ? "Sắp mở" : v.state === "SOLD_OUT" ? "Đã hết" : undefined}
                  extra={<TicketMeta voucher={v} />}
                  aside={<TicketAction voucher={v} busy={claiming === v.code} onClaim={() => void claim(v.code)} />}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Dong phu tren ve: thanh % da luu / da dung, hoac ngay mo voi ma sap mo. */
function TicketMeta({ voucher: v }: { voucher: HuntVoucher }) {
  if (v.state === "UPCOMING" && v.startDate) {
    return <p className="num mt-1 text-[11px] text-accent">Mở lưu từ {formatDay(v.startDate)}</p>;
  }
  // 0%: thanh rong chi lam ve trong nhu chua ai quan tam - an di
  if (!v.claimedPercent || v.state === "SOLD_OUT" || v.state === "USED") return null;
  const verb = v.claimRequired ? "Đã lưu" : "Đã dùng";
  const almostGone = v.claimedPercent >= 80;
  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-border sm:w-24"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v.claimedPercent}
        aria-label={`${verb} ${v.claimedPercent}%`}
      >
        <span className="block h-full bg-accent" style={{ width: `${Math.max(v.claimedPercent, 3)}%` }} />
      </span>
      <span className={cn("num whitespace-nowrap text-[11px]", almostGone ? "text-accent" : "text-muted-foreground")}>
        {almostGone ? "Sắp hết · " : ""}
        {verb} {v.claimedPercent}%
      </span>
    </div>
  );
}

/** Nut goc phai ve: Luu / Dung ngay. Ve het luot, sap mo, da dung thi VoucherTicket hien dong dau. */
function TicketAction({
  voucher: v,
  busy,
  onClaim,
}: {
  voucher: HuntVoucher;
  busy: boolean;
  onClaim: () => void;
}) {
  if (v.state === "CLAIMABLE") {
    return (
      <Button size="sm" onClick={onClaim} disabled={busy} className="shrink-0 px-3 sm:px-4" aria-label={`Lưu mã ${v.code}`}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Lưu
      </Button>
    );
  }
  if (v.state === "CLAIMED" || v.state === "READY") {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {/* Man hep: chu ngan + padding nho de than ve con cho cho dieu kien ma */}
        <Button variant="outline" size="sm" className="px-3 sm:px-4" asChild>
          <Link to="/products">
            <span className="sm:hidden">Dùng</span>
            <span className="hidden sm:inline">Dùng ngay</span>
          </Link>
        </Button>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Check className="size-3" aria-hidden="true" />
          {v.state === "CLAIMED" ? "Đã lưu" : "Có sẵn"}
        </span>
      </div>
    );
  }
  return null;
}
