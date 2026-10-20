import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RevealSection } from "@/components/site/RevealSection";
import { SectionHeading } from "@/components/site/SectionHeading";
import { api } from "@/lib/api";
import { resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Chon hoa theo dip — cach nguoi ta nghi khi di dat hoa ("mai sinh nhat me", "ban khai
 * truong"), khong phai theo danh muc hang. Ma dip khop enum Occasion cua product-service,
 * bam vao la ra danh sach da loc san.
 *
 * Bo cuc bento: Sinh nhat (dip dat nhieu nhat) chiem o lon 2x2, Cuoi hoi o ngang 2x1.
 * Moi o la anh mot bo that trong danh muc (anh seed cua product-service), chon theo tinh
 * than cua dip: chia buon la moc lan trang tren nen den, tinh yeu la cuc do tham.
 */
type Tile = {
  code: string;
  label: string;
  hint: string;
  image: string;
  /** Lop CSS cua o trong luoi bento (co dinh theo thu tu khai bao). */
  span: string;
};

const TILES: Tile[] = [
  {
    code: "BIRTHDAY",
    label: "Sinh nhật",
    hint: "Rực rỡ, nhiều màu, giao đúng ngày để người nhận mở cửa là thấy hoa.",
    image: "uploads/seed/rowan-berry.jpg",
    span: "col-span-2 row-span-2",
  },
  {
    code: "LOVE",
    label: "Tình yêu",
    hint: "Đỏ thẫm, kỷ niệm, lời tỏ tình",
    image: "uploads/seed/deep-red-chrysanth.jpg",
    span: "",
  },
  {
    code: "OPENING",
    label: "Khai trương",
    hint: "Bó lớn, sum suê, chúc buôn may bán đắt",
    image: "uploads/seed/crimson-cluster.jpg",
    span: "",
  },
  {
    code: "CONGRATS",
    label: "Chúc mừng",
    hint: "Tốt nghiệp, thăng chức, lên nhà mới",
    image: "uploads/seed/garden-jars.jpg",
    span: "",
  },
  {
    code: "THANKS",
    label: "Cảm ơn",
    hint: "Thầy cô, đồng nghiệp, khách hàng",
    image: "uploads/seed/lilac-window.jpg",
    span: "",
  },
  {
    code: "WEDDING",
    label: "Cưới hỏi",
    hint: "Hoa cầm tay cô dâu, cổng hoa, bàn tiệc. Đặt trước từ 3 ngày.",
    image: "uploads/seed/peony-blush.jpg",
    span: "col-span-2",
  },
  {
    code: "SYMPATHY",
    label: "Chia buồn",
    hint: "Trắng, trang nhã, giao gấp trong ngày",
    image: "uploads/seed/magnolia-white.jpg",
    span: "",
  },
];

export function Occasions() {
  // So mau that cua tung dip: mot lan goi, dem phia trinh duyet. Loi thi chi an con so.
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listProducts({ page: 0, size: 100 }, controller.signal)
      .then((page) => {
        const next: Record<string, number> = {};
        for (const product of page.content) {
          for (const code of product.occasions) next[code] = (next[code] ?? 0) + 1;
        }
        setCounts(next);
      })
      .catch(() => setCounts(null));
    return () => controller.abort();
  }, []);

  return (
    <RevealSection id="occasions" labelledBy="occasions-heading">
      <div className="shell">
        <SectionHeading
          id="occasions-heading"
          eyebrow="Bạn tặng hoa nhân dịp gì?"
          title="Chọn hoa theo dịp"
          description="Chọn dịp, studio gợi ý những bó hợp nhất. Đặt trước giờ chốt đơn là giao ngay trong ngày."
        />

        <ul
          className="mt-12 grid grid-flow-dense auto-rows-[10.5rem] grid-cols-2 gap-2 sm:auto-rows-[12rem] md:grid-cols-4 lg:auto-rows-[13.5rem] lg:gap-3"
        >
          {TILES.map((tile, index) => {
            const featured = index === 0;
            const count = counts?.[tile.code];
            return (
              <li key={tile.code} data-anim="fade-up" className={tile.span}>
                <Link
                  to={`/products?occasion=${tile.code}`}
                  className="group relative block size-full overflow-hidden bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <img
                    src={resolveImageUrl(tile.image)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05] group-focus-visible:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />

                  {/*
                    Lop phu chuyen tu mau nen cua trang (khong phai den tuyen) len trong suot:
                    chu luon doc duoc ke ca tren anh sang nhu tu dinh huong tim.
                  */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-background via-background/55 to-transparent to-75% transition-opacity duration-500 group-hover:opacity-90"
                  />

                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 sm:p-5 lg:p-6">
                    {/* O nho tren man hep: so mau xuong dong rieng, ten dip khong bi be doi */}
                    <span
                      className={cn(
                        "flex gap-x-3 gap-y-1",
                        featured
                          ? "items-baseline justify-between"
                          : "flex-col items-start sm:flex-row sm:items-baseline sm:justify-between",
                      )}
                    >
                      <span
                        className={cn(
                          "whitespace-nowrap font-display font-semibold italic leading-none text-foreground transition-colors group-hover:text-accent-strong",
                          featured ? "text-4xl sm:text-5xl lg:text-6xl" : "text-[1.375rem] sm:text-2xl lg:text-[1.75rem]",
                        )}
                      >
                        {tile.label}
                      </span>
                      {count ? (
                        <span className="num shrink-0 text-xs text-foreground/75">{count} mẫu</span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "font-light leading-snug text-foreground/75",
                        featured ? "max-w-xs text-sm sm:text-[0.9375rem]" : "hidden text-xs sm:block",
                      )}
                    >
                      {tile.hint}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Khong co dip phu hop: loi vao dat hoa theo yeu cau, de dang chu thay vi anh */}
          <li data-anim="fade-up">
            <Link
              to="/dat-hoa-theo-yeu-cau"
              className="group flex size-full flex-col justify-between border border-dashed border-accent/50 p-4 transition-colors hover:border-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5 lg:p-6"
            >
              <span className="font-display text-2xl font-semibold italic leading-none text-accent lg:text-[1.75rem]">
                Dịp khác?
              </span>
              <span className="text-xs font-light leading-snug text-muted-foreground sm:text-[0.8125rem]">
                Tả bó hoa bạn muốn, studio báo giá cho bạn.
                <span className="mt-2 block text-accent underline decoration-accent/40 underline-offset-4 group-hover:decoration-accent">
                  Đặt theo yêu cầu
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </RevealSection>
  );
}
