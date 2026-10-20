import { RevealSection } from "@/components/site/RevealSection";
import { SectionHeading } from "@/components/site/SectionHeading";

type Piece = {
  name: string;
  src: string;
  alt: string;
  ratio: string;
};

/**
 * Hai cot so le: moi cot gom mot anh doc (3/4) va mot anh ngang (4/3),
 * dat nguoc nhau nen hai cot ket thuc bang nhau, khong de lo khoang trong.
 *
 *   [ doc 3/4  ] [ ngang 4/3 ]
 *   [ ngang 4/3] [ doc 3/4   ]
 *
 * Ly do khong dung luoi 4 cot: trong luoi do, ti le anh ngang luon bang
 * 4 lan ti le anh doc, nen khong the giu dong thoi 3/4 va 4/3 nhu brief yeu cau.
 */
const COLUMNS: Piece[][] = [
  [
    {
      name: "Hổ phách & hoa khô",
      src: "/images/collection-1.jpg",
      alt: "Bó hoa khô tông hổ phách với cỏ pampas, chụp trên nền studio trầm",
      ratio: "aspect-[3/4]",
    },
    {
      name: "Thược dược sẫm",
      src: "/images/collection-4.jpg",
      alt: "Cận cảnh thược dược tím sẫm trên nền đen, gần macro",
      ratio: "aspect-[4/3]",
    },
  ],
  [
    {
      name: "Trắng lễ cưới",
      src: "/images/collection-3.jpg",
      alt: "Những bó cẩm chướng hồng và trắng gói giấy, chụp ngoài trời",
      ratio: "aspect-[4/3]",
    },
    {
      name: "Cúc trắng",
      src: "/images/collection-2.jpg",
      alt: "Bông cúc trắng lớn trên nền xanh thẫm, phong cách biên tập",
      ratio: "aspect-[3/4]",
    },
  ],
];

/**
 * Luoi bien tap: 2 anh doc (3/4) + 2 anh ngang (4/3), khe 2px, canh vuong.
 * Hover: lop phu ngà opacity 0 -> 0.12 + ten tac pham o giua (CSS, khong phai GSAP).
 * Ten tac pham cung hien o duoi anh tren man hinh cham, de hover khong phai kenh duy nhat.
 */
export function SignatureCollection() {
  return (
    <RevealSection id="collection" labelledBy="collection-heading" stagger={0.1}>
      <div className="shell">
        <SectionHeading
          id="collection-heading"
          eyebrow="Tháng 9 · Dahlia, cẩm tú cầu, hoa khô"
          title="Hoa mùa này"
          description="Bốn tác phẩm của mùa này, chụp trong studio ở Hà Nội. Màu hoa không chỉnh sửa."
        />

        <div className="mt-14 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          {COLUMNS.map((column, columnIndex) => (
            <ul key={columnIndex} className="flex flex-col gap-0.5">
              {column.map((piece) => (
                <li key={piece.name} data-anim="reveal">
                  <figure className="group relative">
                    <div className={`${piece.ratio} w-full overflow-hidden`}>
                      <img
                        src={piece.src}
                        alt={piece.alt}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover transition-transform duration-500 ease-[var(--ease-entrance)] group-hover:scale-[1.03]"
                      />
                    </div>

                    {/* Lop phu ngà + ten tac pham — lop trang tri tren man hinh co hover */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 hidden bg-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-[0.12] sm:block"
                    />
                    <figcaption className="pointer-events-none absolute inset-0 hidden items-center justify-center px-4 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex">
                      <span className="font-display text-3xl font-semibold italic text-foreground drop-shadow-[0_2px_14px_rgba(0,0,0,0.75)]">
                        {piece.name}
                      </span>
                    </figcaption>

                    {/* Tren mobile (khong co hover) ten hien thang duoi anh */}
                    <p className="label-micro px-1 py-3 text-muted-foreground sm:hidden">
                      {piece.name}
                    </p>
                  </figure>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}
