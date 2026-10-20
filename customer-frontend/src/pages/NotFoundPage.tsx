import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="shell page-pad">
      <p className="label-micro text-accent">404</p>
      <h1 className="display-section mt-5 text-foreground">Không tìm thấy trang</h1>
      <span aria-hidden="true" className="mt-6 block h-px w-28 bg-accent" />
      <p className="prose-measure mt-6 text-[1.0625rem] font-light leading-relaxed text-muted-foreground">
        Đường dẫn bạn mở không tồn tại trong ứng dụng Bloom Studio.
      </p>
      <div className="mt-9 flex flex-wrap gap-4">
        <Button variant="primary" size="lg" asChild>
          <Link to="/">Về trang chủ</Link>
        </Button>
        <Button variant="ghost" size="lg" asChild>
          <Link to="/products">Xem danh sách hoa</Link>
        </Button>
      </div>
    </div>
  );
}
