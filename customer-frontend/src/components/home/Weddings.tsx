import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RevealSection } from "@/components/site/RevealSection";
import { SectionHeading } from "@/components/site/SectionHeading";

const CHIPS = [
  {
    label: "Lễ cưới",
    src: "/images/wedding-1.jpg",
    alt: "Bó hoa cưới tông hồng và trắng đặt trên vải lanh",
  },
  {
    label: "Tiệc cưới",
    src: "/images/wedding-2.jpg",
    alt: "Bàn tiệc dài với bình hoa nhỏ và nến, ánh sáng trầm",
  },
  {
    label: "Bàn tiệc",
    src: "/images/wedding-3.jpg",
    alt: "Bàn ăn được bày với hoa tươi và ly thủy tinh",
  },
];

export function Weddings() {
  return (
    <RevealSection id="weddings" labelledBy="weddings-heading" className="bg-surface">
      <div className="shell">
        <SectionHeading id="weddings-heading" eyebrow="Trọn gói từ 8 triệu" title="Hoa cưới" />

        <p data-anim="fade-up" className="pull-quote prose-measure mt-10 text-foreground">
          Từ bó hoa cầm tay đến trang trí cả tiệc cưới — studio cùng bạn từ buổi tư vấn đầu tiên tới
          cánh hoa cuối cùng.
        </p>

        <ul className="mt-14 grid grid-cols-1 gap-0.5 sm:grid-cols-3">
          {CHIPS.map((chip) => (
            <li key={chip.label} data-anim="reveal">
              <figure>
                <img
                  src={chip.src}
                  alt={chip.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/5] w-full object-cover"
                />
                <figcaption className="label-micro mt-4 text-muted-foreground">
                  {chip.label}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>

        {/*
          CTA noi dung viec no lam: mo danh muc Hoa cuoi, hoac gui yeu cau dat hoa
          (ngan sach, tong mau, anh mau) de studio bao gia tron goi.
        */}
        <div data-anim="fade-up" className="mt-12 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <Button variant="primary" size="lg" asChild>
            <Link to="/products?category=3">Xem mẫu hoa cưới →</Link>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link to="/dat-hoa-theo-yeu-cau">Nhờ studio báo giá</Link>
          </Button>
        </div>
      </div>
    </RevealSection>
  );
}
