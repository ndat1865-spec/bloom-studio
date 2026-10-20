import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { gsap, useGSAP, EASE_ENTRANCE } from "@/lib/motion";

/**
 * Hero — bo cuc 45/55: trai la panel bien tap, phai la anh tran vien.
 * Mobile: anh len truoc, noi dung xuong duoi (theo DESIGN.md).
 *
 * Chuyen dong: mot GSAP Timeline duy nhat.
 *   label 0s · heading 0.15s · mo ta 0.30s · CTA 0.45s · anh chi tiet 0.60s (scale 0.85 -> 1)
 * Trang thai xuat phat nam trong CSS ([data-anim]) nen khong nhay noi dung truoc khi GSAP chay.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: EASE_ENTRANCE, duration: 0.8 } });

        tl.to('[data-hero="label"]', { y: 0, autoAlpha: 1 }, 0)
          .to('[data-hero="heading"]', { y: 0, autoAlpha: 1, duration: 0.95 }, 0.15)
          .to('[data-hero="sub"]', { y: 0, autoAlpha: 1 }, 0.3)
          .to('[data-hero="cta"]', { y: 0, autoAlpha: 1 }, 0.45)
          .to('[data-hero="detail"]', { scale: 1, autoAlpha: 1, duration: 0.7 }, 0.6);

        return () => {
          tl.kill();
        };
      });

      // Khi nguoi dung bat "giam chuyen dong": CSS da de noi dung o trang thai hien day du,
      // khong tao timeline nao ca.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-anim]", { clearProps: "all" });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="hero-heading"
      className="relative grid min-h-[calc(100svh-4.5rem)] grid-cols-1 lg:grid-cols-[45fr_55fr]"
    >
      {/* Anh: tren mobile len truoc (order-1), tren desktop nam ben phai (order-2) */}
      <div className="relative order-1 h-[52svh] min-h-[20rem] lg:order-2 lg:h-auto lg:min-h-0">
        <img
          src="/images/hero-bouquet.jpg"
          alt="Bó hoa tối màu gồm hồng burgundy, thược dược đen và bạch đàn, chụp trong ánh sáng studio trầm"
          className="size-full object-cover object-center"
          fetchPriority="high"
          decoding="async"
        />
      </div>

      {/* Panel bien tap */}
      <div className="relative order-2 flex flex-col justify-center bg-background px-5 py-14 md:px-10 lg:order-1 lg:px-16 lg:py-12">
        <p data-anim="fade-up" data-hero="label" className="label-micro text-accent">
          Tiệm hoa Hà Nội · Giao trong ngày
        </p>

        <h1
          id="hero-heading"
          data-anim="fade-up"
          data-hero="heading"
          className="display-hero mt-6 text-foreground"
        >
          Gửi một bó hoa,
          <br />
          nói điều
          <br />
          <span className="text-accent">khó nói.</span>
        </h1>

        <p
          data-anim="fade-up"
          data-hero="sub"
          className="prose-measure mt-7 text-[1.0625rem] font-light leading-relaxed text-muted-foreground"
        >
          Chọn bó, chọn cỡ, viết lời chúc — thợ hoa cắm ngay trong ngày và gửi ảnh bó thật cho bạn
          trước khi giao tận tay người nhận khắp nội thành Hà Nội.
        </p>

        <div data-anim="fade-up" data-hero="cta" className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <Button variant="primary" size="lg" asChild className="w-full sm:w-auto">
            <Link to="/products">Đặt hoa ngay →</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild className="w-full sm:w-auto">
            <Link to="/dat-hoa-theo-yeu-cau">Đặt theo yêu cầu</Link>
          </Button>
        </div>

        {/*
          Anh chi tiet de tai ranh gioi hai panel.

          Truoc day dat absolute bottom-16: gia dinh la no luon nam THAP HON khoi CTA.
          Gia dinh do sai khi man hinh khong du cao — noi dung duoc justify-center nen day
          khoi CTA xuong gan day panel, va anh (cao 180px, cach day 64px) trum len nut
          "Wedding flowers". O man 1280x800 thi che mat mot phan nut.

          Gio cho anh nam TRONG LUONG, ngay sau khoi CTA: du man hinh cao bao nhieu,
          no cung khong the de len thu gi phia tren.

          Kem dieu kien chieu cao >= 800px (do thuc te: 1280x800 con du 24px). Anh nay chi la trang tri (aria-hidden), nen
          o man hinh thap (1366x768, 1024x700...) thi an han con hon de no bi cat ngang
          o day khung nhin — trong nhu loi chu khong phai chu y.

          relative z-10 la BAT BUOC: panel anh co lg:order-2 nen theo quy tac ve cua flex,
          no duoc ve SAU panel chu va se dap len nua phai cua tam anh nay.
          Lech sang phai bang margin am (khong phai translate) de GSAP van doc quyen
          ghi transform cho rieng phan scale.
            134px = 64 (px-16 cua panel) + 70 (mot nua chieu rong anh 140px)
                    -> tam anh roi dung mep phai cua panel
        */}
        <div aria-hidden="true" className="relative z-10 mt-4 hidden justify-end lg:[@media(min-height:800px)]:flex">
          <img
            data-anim="detail"
            data-hero="detail"
            src="/images/hero-stem.jpg"
            alt=""
            className="pointer-events-none -mr-[134px] size-[140px] object-cover shadow-[0_18px_48px_rgba(0,0,0,0.5)]"
          />
        </div>
      </div>
    </section>
  );
}
