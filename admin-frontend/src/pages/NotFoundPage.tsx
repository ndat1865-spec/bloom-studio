import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="shell page-pad">
      <div className="card flex flex-col items-center px-6 py-16 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface-raised">
          <SearchX aria-hidden="true" className="size-5 text-muted-foreground" />
        </span>
        <p className="num mt-4 text-xs font-medium text-accent">Lỗi 404</p>
        <h1 className="mt-1 text-xl text-foreground">Không tìm thấy trang</h1>
        <p className="prose-measure mt-2 text-sm text-muted-foreground">
          Đường dẫn bạn mở không tồn tại trong trang quản trị Bloom Studio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" size="md" asChild>
            <Link to="/admin">Về bảng điều khiển</Link>
          </Button>
          <Button variant="outline" size="md" asChild>
            <Link to="/admin/products">Quản lý hoa</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
