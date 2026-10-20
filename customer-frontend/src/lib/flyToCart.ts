/**
 * Hieu ung "bay vao gio": anh bo hoa thu nho bay theo vong cung tu cho khach bam toi icon
 * gio hang tren header, roi moi bao da xong (Promise) de ben goi cong vao gio dung luc cham -
 * so tren badge nhay va gio nay len cung mot nhip voi luc anh roi vao.
 *
 * - Icon gio danh dau bang data-cart-target (CartIndicator). Header co hai icon (desktop /
 *   di dong), lay cai dang hien.
 * - Khong tim thay nguon / dich, hoac khach bat "giam chuyen dong": xong ngay, khong bay.
 * - Dung Web Animations API, khong them thu vien.
 */

const DURATION = 780;
const SIZE = 88;

function visibleTarget(): HTMLElement | null {
  const targets = document.querySelectorAll<HTMLElement>("[data-cart-target]");
  for (const el of targets) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return el;
  }
  return null;
}

export function flyToCart(source: Element | null | undefined, imageUrl: string): Promise<void> {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = visibleTarget();
  // Tab dang an: trinh duyet dung animation, khong bao gio xong -> cong vao gio ngay
  if (reduce || document.hidden || !source || !target) return Promise.resolve();

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (from.width === 0 || from.height === 0) return Promise.resolve();

  // Toa do tam, tinh cho goc tren-trai cua o bay (fixed, 0,0)
  const sx = from.left + from.width / 2 - SIZE / 2;
  const sy = from.top + from.height / 2 - SIZE / 2;
  const tx = to.left + to.width / 2 - SIZE / 2;
  const ty = to.top + to.height / 2 - SIZE / 2;
  // Diem giua cua vong cung: vut len nhanh roi luot ngang vao gio. Gio nam sat mep tren nen
  // KHONG dat dinh cao hon gio - anh se bay ra ngoai man hinh.
  const mx = sx + (tx - sx) * 0.4;
  const my = Math.max(4, Math.min(sy, ty) + Math.abs(sy - ty) * 0.15 - 20);

  const flyer = document.createElement("div");
  flyer.setAttribute("aria-hidden", "true");
  Object.assign(flyer.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    borderRadius: "9999px",
    overflow: "hidden",
    zIndex: "70",
    pointerEvents: "none",
    border: "2px solid var(--color-accent)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    background: "var(--color-surface-raised)",
    willChange: "transform, opacity",
  } satisfies Partial<CSSStyleDeclaration>);

  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = "";
  Object.assign(img.style, { width: "100%", height: "100%", objectFit: "cover" });
  flyer.appendChild(img);
  document.body.appendChild(flyer);

  const animation = flyer.animate(
    [
      { transform: `translate(${sx}px, ${sy}px) scale(0.6)`, opacity: 0, offset: 0 },
      { transform: `translate(${sx}px, ${sy - 12}px) scale(1)`, opacity: 1, offset: 0.14 },
      { transform: `translate(${mx}px, ${my}px) scale(0.7)`, opacity: 1, offset: 0.58, easing: "ease-in" },
      { transform: `translate(${tx}px, ${ty}px) scale(0.18)`, opacity: 0.7, offset: 1 },
    ],
    { duration: DURATION, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "forwards" },
  );

  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(safety);
      flyer.remove();
      resolve();
    };
    // Du phong: animation bi dung giua chung (khach chuyen tab...) thi van cong vao gio,
    // khong de mat bo hoa khach vua bam them.
    const safety = window.setTimeout(done, DURATION + 300);
    animation.onfinish = done;
    animation.oncancel = done;
  });
}
