import { Link } from "react-router-dom";
import { RevealSection } from "@/components/site/RevealSection";
import { SectionHeading } from "@/components/site/SectionHeading";

const ROWS = [
  {
    name: "Bó hoa & bình hoa",
    description: "Bó tay theo mùa, cắt và cắm ngay ngày bạn đặt. Ba cỡ bó, giao trong ngày.",
    price: "từ 340.000₫",
    to: "/products?category=1",
    image: "/images/collection-1.jpg",
  },
  {
    name: "Hoa sự kiện",
    description: "Khai trương, tiệc công ty, bàn tiệc, vách hoa. Đặt trước 2–3 ngày.",
    price: "từ 1.800.000₫",
    to: "/products?category=2",
    image: "/images/collection-3.jpg",
  },
  {
    name: "Hoa cưới",
    description: "Hoa cầm tay cô dâu, cổng hoa, trang trí tiệc. Đặt trước từ 3 ngày.",
    price: "từ 8.000.000₫",
    to: "/products?category=3",
    image: "/images/wedding-2.jpg",
  },
];

/**
 * Mat na lam TAN DAN bon canh cua anh nen.
 *
 * Hai gradient chong len nhau roi lay phan GIAO (intersect): mot cai tan dan trai-phai,
 * mot cai tan dan tren-duoi. Ket qua la anh dam o giua va tan het o ria, khong de lai
 * mot canh cat thang nao — neu chi dung mot gradient thi hai canh con lai van sac let.
 *
 * mask-composite la chuan moi; -webkit-mask-composite: source-in la ban cu cho Safari.
 */
const FEATHER = {
  maskImage:
    "linear-gradient(to right, transparent, #000 30%, #000 70%, transparent), " +
    "linear-gradient(to bottom, transparent, #000 34%, #000 66%, transparent)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent, #000 30%, #000 70%, transparent), " +
    "linear-gradient(to bottom, transparent, #000 34%, #000 66%, transparent)",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
} as const;

/**
 * Ba hang dich vu tran chieu ngang.
 *
 * Re chuot vao mot hang: anh cua hang do hien len lam NEN ngay trong hang, cat giua,
 * bon canh tan dan vao nen trang. Toan bo bang CSS transition — khong can GSAP,
 * va tu dong dung yen khi nguoi dung bat "giam chuyen dong" (xem quy tac trong index.css).
 *
 * Anh de opacity thap va nam duoi chu (z thap hon), nen chu van doc duoc binh thuong.
 */
export function ArrangementTypes() {
  return (
    <RevealSection id="arrangements" labelledBy="arrangements-heading">
      <div className="shell">
        <SectionHeading
          id="arrangements-heading"
          eyebrow="Bó hoa · Sự kiện · Cưới hỏi"
          title="Studio nhận làm"
          description="Ba cách chúng tôi làm việc cùng bạn — từ một bó hoa cắt trong ngày đến toàn bộ phần hoa cho một đám cưới."
        />
      </div>

      <ul className="mt-14 border-t border-border">
        {ROWS.map((row) => (
          <li key={row.name} data-anim="fade-up" className="border-b border-border">
            <Link
              to={row.to}
              className="group relative block overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {/*
                Lop anh nen. Bat len khi hover HOAC khi focus bang ban phim,
                de nguoi dung khong dung chuot cung thay dung hieu ung do.
                Anh phong nhe tu 1.08 ve 1 khi hien, tao cam giac "tien lai gan".
                Phan phong nay la chuyen dong that nen bi tat bang motion-reduce; rieng
                viec mo dan thi giu lai vi no khong phai chuyen dong.
              */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <img
                  src={row.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={FEATHER}
                  className="size-full scale-[1.08] object-cover opacity-30 transition-transform duration-[900ms] ease-out group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:scale-100 motion-reduce:transition-none"
                />

                {/*
                  Lop phu toi rat mong. Anh cua ba hang co do sang khac nhau (canh tu cau
                  kho rat nhat, hoa cuoi toi hon); khong co lop nay thi tieu de mau accent
                  de bi chim tren nhung mang anh sang.
                */}
                <span className="absolute inset-0 bg-background/25" />
              </span>

              {/* relative: giu chu NAM TREN lop anh */}
              <div className="shell relative flex flex-col gap-4 py-9 md:flex-row md:items-baseline md:gap-10 md:py-11">
                <h3 className="display-lg shrink-0 text-foreground transition-colors duration-200 group-hover:text-accent group-focus-visible:text-accent md:basis-[38%]">
                  {row.name}
                </h3>

                <p className="flex-1 text-sm font-light leading-relaxed text-muted-foreground transition-colors duration-200 group-hover:text-foreground md:text-base">
                  {row.description}
                </p>

                <div className="flex items-center gap-6 md:shrink-0">
                  <span className="num label-micro text-foreground">{row.price}</span>
                  <span
                    aria-hidden="true"
                    className="text-accent transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </RevealSection>
  );
}
