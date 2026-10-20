import type { ReactNode } from "react";
import type { MyVoucher } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Nhan ngan cho ma KHONG dung duoc (trang vi ma). BELOW_MIN tinh rieng theo don. */
const STATUS_STAMP: Record<string, string> = {
  ALREADY_USED: "Đã dùng",
  EXPIRED: "Hết hạn",
  USED_UP: "Hết lượt",
  NOT_STARTED: "Chưa tới ngày",
  INACTIVE: "Ngừng áp dụng",
};

/** "50K" / "1,5TR" — so lon tren cuong ve, doc nhanh hon "50.000 ₫". */
function compactVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}TR`;
  if (value >= 1000) return `${(value / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}K`;
  return String(value);
}

function formatDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

/** So ngay tu hom nay (gio may khach, chi de nhac "sap het han") toi ngay iso. */
function daysUntil(iso: string): number {
  const end = new Date(`${iso.slice(0, 10)}T23:59:59`);
  return Math.floor((end.getTime() - Date.now()) / 86_400_000);
}

/** Dieu kien cua ma, viet thanh mot dong. */
export function voucherConditions(v: MyVoucher): string {
  const parts: string[] = [];
  if (v.type === "PERCENT" && v.maxDiscount) parts.push(`Tối đa ${formatPrice(v.maxDiscount)}`);
  parts.push(v.minOrderValue ? `Đơn từ ${formatPrice(v.minOrderValue)}` : "Mọi đơn hoa");
  if (v.endDate) parts.push(`HSD ${formatDay(v.endDate)}`);
  return parts.join(" · ");
}

/**
 * Mot ma giam gia ve kieu cuong ve: cuong trai la muc giam, than phai la ma + dieu kien.
 * Hai khuyet tron o duong xe dung mask nen dat tren nen nao cung dung.
 * Dung chung cho trang "Ma giam gia cua toi" va popup chon ma o trang dat hoa.
 */
export function VoucherTicket({
  voucher,
  amount,
  selected = false,
  aside,
  stamp: stampOverride,
  extra,
  className,
}: {
  voucher: MyVoucher;
  /** Gia tri don dang xet (popup chon ma) - de noi "mua them X de dung". */
  amount?: number;
  selected?: boolean;
  /** Goc phai: nut chon / nut chep ma. */
  aside?: ReactNode;
  /** Thay nhan dong dau mac dinh theo status (trang San voucher: "Sắp mở", "Hết lượt"). */
  stamp?: string;
  /** Dong phu duoi dieu kien, vi du thanh "Đã lưu 63%". */
  extra?: ReactNode;
  className?: string;
}) {
  const usable = voucher.status === "USABLE";
  const belowMin = voucher.status === "BELOW_MIN";
  const stamp = stampOverride ?? STATUS_STAMP[voucher.status];
  const soon = usable && voucher.endDate ? daysUntil(voucher.endDate) : null;

  let note: ReactNode = null;
  if (belowMin && amount != null && voucher.minOrderValue) {
    note = (
      <span className="text-accent">Mua thêm {formatPrice(voucher.minOrderValue - amount)} để dùng mã này</span>
    );
  } else if (!usable && voucher.reason && !stamp) {
    note = <span className="text-muted-foreground">{voucher.reason}</span>;
  } else if (usable && voucher.discount > 0) {
    note = <span className="text-success">Đơn này giảm {formatPrice(voucher.discount)}</span>;
  } else if (soon != null && soon <= 3) {
    note = <span className="text-accent">{soon <= 0 ? "Hết hạn hôm nay" : `Còn ${soon + 1} ngày`}</span>;
  }

  return (
    <div
      className={cn(
        "relative flex min-h-24 overflow-hidden border transition-colors",
        selected ? "border-accent bg-accent/10" : "border-border bg-surface-raised/60",
        className,
      )}
      style={{
        // Hai khuyet tron o duong xe giua cuong ve va than ve (tam o x = 5.75rem)
        WebkitMask:
          "radial-gradient(circle 8px at 5.75rem 0, #0000 97%, #000) top / 100% 51% no-repeat, radial-gradient(circle 8px at 5.75rem 100%, #0000 97%, #000) bottom / 100% 51% no-repeat",
        mask: "radial-gradient(circle 8px at 5.75rem 0, #0000 97%, #000) top / 100% 51% no-repeat, radial-gradient(circle 8px at 5.75rem 100%, #0000 97%, #000) bottom / 100% 51% no-repeat",
      }}
    >
      {/* Cuong ve: muc giam */}
      <div
        className={cn(
          "flex w-23 shrink-0 flex-col items-center justify-center px-2 text-center",
          usable || belowMin ? "bg-accent/15 text-accent" : "bg-border/40 text-muted-foreground",
        )}
      >
        <span className="text-[10px] font-light">giảm</span>
        <span className="num font-display text-[1.7rem] font-semibold italic leading-none">
          {voucher.type === "PERCENT" ? `${voucher.value}%` : compactVnd(voucher.value)}
        </span>
      </div>

      {/* Duong xe */}
      <span aria-hidden="true" className="w-0 shrink-0 border-l border-dashed border-border-strong/60" />

      {/* Than ve */}
      <div className={cn("flex min-w-0 flex-1 items-center gap-3 px-4 py-3", !usable && !belowMin && "opacity-60")}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="num text-sm font-medium tracking-wider text-foreground">{voucher.code}</p>
            {voucher.personal ? (
              <span className="rounded-full border border-accent/60 px-2 py-0.5 text-[10px] text-accent">
                Dành riêng cho bạn
              </span>
            ) : null}
          </div>
          {voucher.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs font-light text-foreground/80">{voucher.description}</p>
          ) : null}
          <p className="num mt-1 text-[11px] font-light text-muted-foreground">{voucherConditions(voucher)}</p>
          {note ? <p className="mt-1 text-[11px]">{note}</p> : null}
          {extra}
        </div>
        {stamp ? (
          <span className="label-micro shrink-0 rotate-[-8deg] border border-border-strong/70 px-2 py-1 text-muted-foreground">
            {stamp}
          </span>
        ) : (
          aside
        )}
      </div>
    </div>
  );
}
