import type { ReactNode } from "react";
import { Flower2, ShieldCheck } from "lucide-react";

/**
 * Khung trang dang nhap cua app quan tri: mot the o giua man hinh.
 * Khong dung bo cuc chia doi co anh hoa nhu cua hang — day la cua vao cong cu noi bo,
 * can gon va ro, khong can quang cao.
 */
export function AuthLayout({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 py-12">
      {/* Quang sang mo phia tren — chi trang tri, khong mang y nghia */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-accent text-background"
          >
            <Flower2 className="size-5" />
          </span>
          <p className="mt-3 font-display text-xl font-bold italic text-foreground">Bloom Studio</p>
        </div>

        <div className="card mt-6 p-6">
          <h1 className="text-xl text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
          <div className="mt-6">{children}</div>
        </div>

        <div className="mt-5">{footer}</div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-subtle-foreground">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Khu vực nội bộ · Chỉ dành cho quản trị viên
        </p>
      </div>
    </div>
  );
}
