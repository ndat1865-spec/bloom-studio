import { Link } from "react-router-dom";
import { RevealSection } from "@/components/site/RevealSection";

/**
 * Band dusty rose tran vien — diem dao nguoc duy nhat cua trang.
 * Chu va nut dung mau nen xanh rung de dat tuong phan tren nen rose.
 */
export function DeliveryCta() {
  return (
    <RevealSection id="delivery" labelledBy="delivery-heading" className="bg-accent">
      <div className="shell">
        <h2 id="delivery-heading" data-anim="fade-up" className="display-section text-background">
          Giao trong ngày, nội thành Hà Nội
        </h2>

        <p
          data-anim="fade-up"
          className="prose-measure mt-6 text-[1.0625rem] font-light leading-relaxed text-background/85"
        >
          Hoa tươi không đi bưu kiện liên tỉnh — studio chỉ giao trong nội thành để hoa tới tay người
          nhận còn tươi nhất. Trả khi nhận hoa hoặc qua VNPay, MoMo, ZaloPay.
        </p>

        <div data-anim="fade-up" className="mt-9">
          <Link
            to="/products"
            className="inline-flex h-12 items-center justify-center border border-background bg-background px-8 font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-foreground transition-colors duration-200 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            Đặt hoa ngay →
          </Link>
        </div>

        <p data-anim="fade-up" className="label-micro mt-8 text-background/90">
          Miễn phí giao từ 800.000₫ · Đặt trước 15:00 giao hôm nay · Ảnh bó thật trước khi giao
        </p>
      </div>
    </RevealSection>
  );
}
