import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Chọn hoa", "Đặt hoa", "Hoàn tất"] as const;

/**
 * Chi dan buoc cua luong mua: Gio hang -> Thanh toan -> Hoan tat.
 *
 * Dang hairline + nhan micro, khong dung stepper tron kieu Bootstrap —
 * de dong nhip voi cac duong ke manh cua toan trang (xem DESIGN.md).
 * Trang thai KHONG chi dua vao mau: buoc da qua co dau check, buoc hien tai
 * duoc danh dau bang aria-current.
 */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Tiến trình đặt hàng" className="mt-8">
      <ol className="flex items-center gap-3 sm:gap-5">
        {STEPS.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex flex-1 items-center gap-3 sm:gap-5">
              <div className="flex min-w-0 items-center gap-2">
                {done ? (
                  <Check className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "num text-[10px] font-medium",
                      active ? "text-accent" : "text-muted-foreground",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                )}
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "label-micro whitespace-nowrap",
                    active ? "text-foreground" : done ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>

              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px flex-1",
                    index < current ? "bg-accent" : "bg-border",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
