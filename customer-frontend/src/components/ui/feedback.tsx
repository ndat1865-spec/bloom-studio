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
      className={cn("animate-pulse bg-surface-raised", className)}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="border border-border bg-surface">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-4">
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
    <div className="flex flex-col items-center border border-dashed border-border px-6 py-16 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
      <h3 className="display-lg mt-5 text-foreground">{title}</h3>
      <p className="prose-measure mt-3 text-sm font-light text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
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
      className="flex flex-col items-center border border-danger/60 bg-danger/5 px-6 py-14 text-center"
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
        "flex items-start gap-2.5 border px-4 py-3 text-sm",
        isError
          ? "border-danger/60 bg-danger/10 text-danger"
          : "border-success/60 bg-success/10 text-success",
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
