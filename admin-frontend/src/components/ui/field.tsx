import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
   Label — moi input deu co label that, placeholder khong phai label.
   ============================================================ */
export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("block text-[0.8125rem] font-medium text-muted-foreground", className)}
    {...props}
  />
));
Label.displayName = "Label";

/*
  Kieu o nhap cua cong cu quan tri: hop co vien, bo goc 6px, cao 36px.
  Vien doi sang mau diem nhan khi focus — day la tin hieu chinh, outline
  cua ban phim van giu de nguoi dung Tab thay ro.
*/
const controlClasses = [
  "h-9 w-full rounded-[var(--radius-sm)] border bg-background px-3",
  "font-sans text-sm text-foreground placeholder:text-subtle-foreground",
  "transition-colors duration-150",
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      controlClasses,
      invalid ? "border-danger" : "border-border-strong focus:border-accent",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      controlClasses,
      "h-auto min-h-24 resize-y py-2 leading-relaxed",
      invalid ? "border-danger" : "border-border-strong focus:border-accent",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

/** Select gon nhe dung thang <select> — du cho cac danh sach ngan trong trang admin. */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlClasses,
        "appearance-none pr-8",
        invalid ? "border-danger" : "border-border-strong focus:border-accent",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
    >
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
        <path d="M1 1.5 6 6.5l5-5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </span>
  </div>
));
NativeSelect.displayName = "NativeSelect";

/** Dong loi duoi input: luon co icon + chu, khong chi dua vao mau. */
export function FieldError({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function FieldHint({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-subtle-foreground">
      {children}
    </p>
  );
}

/** Nhom label + control + thong bao, bao dam lien ket aria dung. */
export function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: {
    id: string;
    invalid: boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
  className?: string;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("w-full", className)}>
      <Label htmlFor={id} className="mb-1.5">
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </Label>
      {children({ id, invalid: Boolean(error), "aria-describedby": describedBy })}
      <FieldError id={errorId}>{error}</FieldError>
      <FieldHint id={hintId}>{hint}</FieldHint>
    </div>
  );
}
