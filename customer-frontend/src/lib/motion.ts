import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/** Dang ky plugin mot lan o pham vi module (khong dang ky lai moi render). */
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };

export const EASE_ENTRANCE = "power3.out";

/**
 * Reveal khi cuon toi — dung cho cac nhom noi dung cua landing page.
 *
 * - `once: true`: entrance chi chay mot lan moi lan mount, khong lap khi cuon len xuong
 * - Trang thai xuat phat da co trong CSS ([data-anim]) nen khong bi nhay noi dung
 * - Chay trong gsap.matchMedia: khi nguoi dung bat "giam chuyen dong",
 *   noi dung hien day du ngay lap tuc thay vi animate
 */
export function revealOnScroll(
  scope: HTMLElement,
  selector: string,
  options: { stagger?: number; y?: number; duration?: number; start?: string } = {},
) {
  const targets = gsap.utils.toArray<HTMLElement>(selector, scope);
  if (targets.length === 0) return;

  gsap.to(targets, {
    y: 0,
    autoAlpha: 1,
    duration: options.duration ?? 0.75,
    ease: EASE_ENTRANCE,
    stagger: options.stagger ?? 0.08,
    scrollTrigger: {
      trigger: scope,
      start: options.start ?? "top 82%",
      once: true,
    },
  });
}

/** Duong ke dusty rose: scaleX 0 -> 1, goc ben trai, 0.5s khi section vao viewport. */
export function drawRules(scope: HTMLElement, selector = '[data-anim="rule"]') {
  const rules = gsap.utils.toArray<HTMLElement>(selector, scope);
  if (rules.length === 0) return;

  gsap.to(rules, {
    scaleX: 1,
    duration: 0.5,
    ease: EASE_ENTRANCE,
    scrollTrigger: { trigger: scope, start: "top 85%", once: true },
  });
}

/**
 * Luoi an toan: khong bao gio de noi dung ket lai o opacity 0.
 *
 * Neu mot lan refresh roi trung luc dang cuon, mot ScrollTrigger co the bo lo
 * thoi diem "enter". Ham nay quet cac phan tu [data-anim] van con an nhung da
 * nam trong vung doc duoc, roi cho chung hien ngay.
 * Noi dung quan trong hon hieu ung.
 */
function revealStranded() {
  const limit = window.innerHeight * 0.85;
  document.querySelectorAll<HTMLElement>("[data-anim]").forEach((element) => {
    if (getComputedStyle(element).opacity !== "0") return;
    if (element.getBoundingClientRect().top >= limit) return;
    gsap.to(element, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      scaleX: 1,
      duration: 0.4,
      ease: EASE_ENTRANCE,
      overwrite: "auto",
    });
  });
}

/**
 * Lam moi ScrollTrigger sau khi font hoac anh lam thay doi layout.
 *
 * Anh dung loading="lazy" tai xong o thoi diem bat ky va lam doi chieu cao trang;
 * neu khong tinh lai, cac moc start/end cua ScrollTrigger se lech va co section
 * khong bao gio duoc reveal (noi dung ket o opacity 0).
 *
 * Cac lan goi duoc gop bang mot timer 120ms -> khong refresh o moi anh, moi render.
 * Tra ve ham don dep de goi trong useEffect.
 */
export function refreshTriggersWhenReady() {
  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      ScrollTrigger.refresh();
      revealStranded();
    }, 120);
  };

  document.fonts?.ready.then(schedule).catch(schedule);

  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule);

  // Su kien load cua <img> khong noi bot -> bat o pha capture
  const onLoad = (event: Event) => {
    if ((event.target as HTMLElement | null)?.tagName === "IMG") schedule();
  };
  document.addEventListener("load", onLoad, true);

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("load", schedule);
    document.removeEventListener("load", onLoad, true);
  };
}
