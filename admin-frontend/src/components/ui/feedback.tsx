import * as React from "react";
import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cac trang thai du lieu bat buoc theo DESIGN.md:
 * loading (skeleton dung hinh dang noi dung that), empty, error, success.
 * Moi trang thai deu co icon + chu — mau khong bao gio la kenh duy nhat.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-surface-raised", className)}
      aria-hidden="true"
    />
  );
}

export function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index}>
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface-raised">
        <Inbox className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base text-foreground">{title}</h3>
      <p className="prose-measure mt-1.5 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-[var(--radius-md)] border border-danger/40 bg-danger/5 px-6 py-12 text-center"
    >
      <AlertCircle className="size-6 text-danger" aria-hidden="true" />
      <p className="prose-measure mt-4 text-sm text-foreground">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export type ToastTone = "success" | "error";

/** Thong bao ket qua thao tac — dung role phu hop de trinh doc man hinh doc duoc. */
export function Notice({
  tone,
  children,
  className,
}: {
  tone: ToastTone;
  children: React.ReactNode;
  className?: string;
}) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-4 py-3 text-sm",
        isError
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-success/40 bg-success/10 text-success",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="text-foreground">{children}</span>
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      {label}
    </span>
  );
}
