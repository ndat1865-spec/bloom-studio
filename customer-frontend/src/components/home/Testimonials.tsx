import { Star } from "lucide-react";
import { RevealSection } from "@/components/site/RevealSection";
import { SectionHeading } from "@/components/site/SectionHeading";

const QUOTES = [
  {
    quote:
      "Đặt hoa lúc 9 giờ sáng, 2 giờ chiều đã nhận. Bó hoa khác hẳn hoa bán sẵn ngoài tiệm — đẹp thật sự.",
    name: "Minh Anh",
    occasion: "Ba Đình · Sinh nhật",
  },
  {
    quote:
      "Studio làm hoa cho tiệc cưới của chúng tôi ở Tây Hồ. Ba buổi tư vấn, không ép mua thêm, bàn tiệc còn đẹp hơn cả bản phác thảo.",
    name: "Quang & Thảo",
    occasion: "Tây Hồ · Tiệc cưới",
  },
  {
    quote:
      "Văn phòng đặt hoa quầy lễ tân mỗi sáng thứ Hai. Tuần nào cũng khác, luôn đúng mùa, chưa trễ lần nào.",
    name: "Chị Lan",
    occasion: "Cầu Giấy · Văn phòng",
  },
];

export function Testimonials() {
  return (
    <RevealSection id="testimonials" labelledBy="testimonials-heading">
      <div className="shell">
        <SectionHeading id="testimonials-heading" eyebrow="4,9 / 5 · 312 đánh giá" title="What People Say" />

        <ul className="mt-14 grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-3">
          {QUOTES.map((item) => (
            <li key={item.name} data-anim="fade-up" className="flex flex-col justify-between">
              {/* Duong ke rose thay cho khung the: dong nhip voi cac hairline khac cua trang */}
              <span aria-hidden="true" className="mb-7 block h-px w-full bg-accent/50" />

              <blockquote className="flex-1 font-display text-xl font-normal italic leading-relaxed text-foreground">
                {item.quote}
              </blockquote>

              <div className="mt-8">
                <div className="flex gap-1" role="img" aria-label="Đánh giá 5 trên 5 sao">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className="size-3.5 fill-accent text-accent"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <p className="label-micro mt-4 text-muted-foreground">
                  {item.name} · {item.occasion}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </RevealSection>
  );
}
