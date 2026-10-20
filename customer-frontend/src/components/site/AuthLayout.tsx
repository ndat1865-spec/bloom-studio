import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Khung dung chung cho /login va /register.
 *
 * Bo cuc lay tu mockup Figma "Login Page (Community)": chia doi man hinh,
 * bieu mau ben trai, tranh tinh vat hoa tran vien ben phai.
 * Mau sac / font / bo goc dung tokens cua Bloom Studio (xem DESIGN.md),
 * khong copy theme sang cua mockup — ly do ghi trong docs/prompt-auth-screens.md.
 *
 * Duoi lg: an cot tranh, bieu mau chiem toan bo chieu rong.
 */
export function AuthLayout({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-2">
      {/* ---------- Cot bieu mau ---------- */}
      <div className="flex flex-col justify-center px-5 py-12 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-[26rem]">
          <Link
            to="/"
            className="font-display text-2xl font-bold italic leading-none text-accent transition-colors hover:text-accent-strong"
          >
            Bloom Studio
          </Link>

          <p className="label-micro mt-12 text-accent">{eyebrow}</p>

          <h1 className="display-section mt-5 text-foreground">{title}</h1>
          <span aria-hidden="true" className="mt-6 block h-px w-28 bg-accent" />

          <p className="mt-6 text-[0.9375rem] font-light leading-relaxed text-muted-foreground">
            {intro}
          </p>

          <div className="mt-9">{children}</div>

          <div className="mt-8">{footer}</div>

          <p className="label-micro mt-14 text-muted-foreground">
            © 2026 Bloom Studio · All rights reserved
          </p>
        </div>
      </div>

      {/* ---------- Cot tranh (an duoi lg) ---------- */}
      <div className="relative hidden lg:block">
        <img
          src="/images/auth-still-life.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-center"
        />
      </div>
    </div>
  );
}
