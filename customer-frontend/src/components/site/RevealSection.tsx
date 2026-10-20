import { useRef } from "react";
import type { ReactNode } from "react";
import { drawRules, gsap, revealOnScroll, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Bao mot section cua landing page va gan reveal khi cuon.
 *
 * - useGSAP + scope: selector khong ro ri sang component khac, tu don khi unmount
 *   (ke ca khi React StrictMode chay lai lifecycle)
 * - gsap.matchMedia: khi nguoi dung bat "giam chuyen dong" thi khong tao ScrollTrigger nao,
 *   noi dung van hien day du vi trang thai xuat phat trong CSS chi ap dung o no-preference
 * - once: true trong revealOnScroll -> entrance chi chay mot lan, khong lap khi cuon len xuong
 */
export function RevealSection({
  id,
  children,
  className,
  stagger = 0.08,
  labelledBy,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  stagger?: number;
  labelledBy?: string;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scope = root.current;
        if (!scope) return;
        revealOnScroll(scope, '[data-anim="fade-up"], [data-anim="reveal"]', { stagger });
        drawRules(scope);
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-anim]", { clearProps: "all" });
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [stagger] },
  );

  return (
    <section
      id={id}
      ref={root}
      aria-labelledby={labelledBy}
      className={cn("section-pad", className)}
    >
      {children}
    </section>
  );
}
