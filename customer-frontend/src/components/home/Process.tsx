import { RevealSection } from "@/components/site/RevealSection";
import { SectionHeading } from "@/components/site/SectionHeading";

const STEPS = [
  {
    number: "01",
    title: "Chọn bó & ngày giao",
    body: "Chọn theo dịp, chọn cỡ bó, viết lời chúc lên thiệp. Không thấy mẫu ưng ý thì tả bó hoa bạn muốn — studio báo giá.",
  },
  {
    number: "02",
    title: "Cắm tay, gửi ảnh thật",
    body: "Thợ hoa cắm bó của bạn vào đúng ngày giao, chụp ảnh bó thật gửi vào trang đơn và email để bạn duyệt trước.",
  },
  {
    number: "03",
    title: "Giao tận tay trong ngày",
    body: "Đặt trước 15:00 là giao ngay hôm nay trong nội thành Hà Nội, theo khung giờ sáng, chiều hoặc tối bạn chọn.",
  },
];

export function Process() {
  return (
    <RevealSection id="process" labelledBy="process-heading" className="bg-surface">
      <div className="shell">
        <SectionHeading
          id="process-heading"
          eyebrow="Đặt trước 15:00 · Giao trong ngày"
          title="Đặt hoa thế nào"
        />

        <ol className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} data-anim="fade-up" className="relative">
              {/* So lon mo phia sau — trang tri, khong doc bang trinh doc man hinh */}
              <span
                aria-hidden="true"
                className="num pointer-events-none absolute -top-10 left-0 select-none font-display text-[7rem] font-bold italic leading-none text-foreground opacity-[0.05]"
              >
                {step.number}
              </span>

              <div className="relative">
                <p className="label-micro text-accent">Bước {step.number}</p>
                <h3 className="display-lg mt-4 text-foreground">{step.title}</h3>
                <p className="prose-measure mt-4 text-sm font-light leading-relaxed text-muted-foreground md:text-[0.9375rem]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </RevealSection>
  );
}
