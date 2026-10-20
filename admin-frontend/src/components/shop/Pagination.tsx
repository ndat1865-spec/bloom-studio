import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Danh sach so trang can hien, co dau "…" khi qua nhieu trang. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index);

  const pages = new Set<number>([0, total - 1, current]);
  for (const delta of [-1, 1]) {
    const candidate = current + delta;
    if (candidate > 0 && candidate < total - 1) pages.add(candidate);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = -1;
  for (const page of sorted) {
    if (previous >= 0 && page - previous > 1) out.push("gap");
    out.push(page);
    previous = page;
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  label = "Phân trang",
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const items = pageWindow(page, totalPages);

  const arrowClasses =
    "inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label={label} className="flex items-center justify-end gap-1">
      <button
        type="button"
        className={arrowClasses}
        onClick={() => onChange(page - 1)}
        disabled={page <= 0}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="sr-only">Trang trước</span>
      </button>

      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
            className={cn(
              "num inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-sm)] px-2 text-[0.8125rem] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              item === page
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {item + 1}
            <span className="sr-only">{item === page ? " (trang hiện tại)" : ""}</span>
          </button>
        ),
      )}

      <button
        type="button"
        className={arrowClasses}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
        <span className="sr-only">Trang sau</span>
      </button>
    </nav>
  );
}
