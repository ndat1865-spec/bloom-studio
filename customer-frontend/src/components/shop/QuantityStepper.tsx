import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bo chon so luong 1..99, co nhan that cho o nhap.
 *
 * Thiet ke: MOT khoi lien mach thay vi ba o vien roi nhau.
 *  - Chi mot duong vien bao ngoai; hai nut la icon tran, khong vien rieng
 *  - O so trong suot, khong lo ra la <input type=number>
 *  - Ca cum sang len khi hover / focus vao trong, giong cac o nhap khac
 */
export function QuantityStepper({
  id,
  value,
  onChange,
  label = "Số lượng",
  className,
}: {
  id: string;
  value: number;
  onChange: (next: number) => void;
  label?: string;
  className?: string;
}) {
  const buttonClasses =
    "inline-flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-25";

  return (
    <div
      className={cn(
        "inline-flex items-center border border-border bg-surface-raised/40 transition-colors hover:border-border-strong/50 focus-within:border-accent/60",
        className,
      )}
    >
      <button
        type="button"
        className={buttonClasses}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label={`Giảm ${label.toLowerCase()}`}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>

      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={99}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.min(99, Math.max(1, Math.trunc(next))));
        }}
        className="num h-10 w-10 border-0 bg-transparent text-center text-sm text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        className={buttonClasses}
        onClick={() => onChange(Math.min(99, value + 1))}
        disabled={value >= 99}
        aria-label={`Tăng ${label.toLowerCase()}`}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
