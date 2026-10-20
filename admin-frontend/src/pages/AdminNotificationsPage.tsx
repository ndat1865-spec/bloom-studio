import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, TableRowSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/shop/Pagination";
import { PageHeader } from "@/components/site/AdminShell";
import { api, type NotificationLog, type Page } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

/** Hop thu gia lap (Mailpit) chay kem Docker Compose - xem thu that da gui. */
const MAILPIT_URL = "http://localhost:8025";

const EVENT_LABEL: Record<string, string> = {
  PLACED: "Đặt đơn",
  PAID: "Đã thanh toán",
  SHIPPED: "Giao cho GHN",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã huỷ",
  REFUNDED: "Đã hoàn tiền",
};

const STATUS: Record<NotificationLog["status"], { label: string; tone: string }> = {
  SENT: { label: "Đã gửi", tone: "bg-success/12 text-success ring-success/25" },
  FAILED: { label: "Lỗi", tone: "bg-danger/12 text-danger ring-danger/25" },
  SKIPPED: { label: "Bỏ qua", tone: "bg-surface-raised text-muted-foreground ring-border" },
};

/**
 * Nhat ky thong bao cua notification-service.
 *
 * Moi dong la ket qua xu ly mot su kien don hang nhan tu RabbitMQ: gui email cho ai, thanh
 * cong hay khong. Thu gui that nam trong hop thu Mailpit.
 */
export default function AdminNotificationsPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<NotificationLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.listNotifications(page, PAGE_SIZE));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Không tải được nhật ký thông báo.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Thông báo"
        description="Email gửi tự động khi đơn hàng đổi trạng thái. order-service phát sự kiện qua RabbitMQ, notification-service nhận và gửi thư."
      />

      <section aria-labelledby="notification-list-heading" className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 id="notification-list-heading" className="text-base text-foreground">
              Nhật ký gửi
            </h2>
            {data ? <span className="num text-xs text-muted-foreground">{data.totalElements} thông báo</span> : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw aria-hidden="true" className={cn(loading && "animate-spin")} />
              Tải lại
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={MAILPIT_URL} target="_blank" rel="noreferrer noopener">
                <ExternalLink aria-hidden="true" />
                Mở hộp thư Mailpit
              </a>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[60rem]">
            <caption className="sr-only">Thông báo với thời gian, sự kiện, đơn, người nhận, tiêu đề và trạng thái</caption>
            <thead>
              <tr>
                <th scope="col">Thời gian</th>
                <th scope="col">Sự kiện</th>
                <th scope="col">Đơn</th>
                <th scope="col">Gửi tới</th>
                <th scope="col">Tiêu đề</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data
                ? Array.from({ length: 5 }).map((_, index) => <TableRowSkeleton key={index} columns={6} />)
                : data?.content.map((n) => (
                    <tr key={n.id}>
                      <td className="num whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="whitespace-nowrap text-foreground">{EVENT_LABEL[n.eventType] ?? n.eventType}</td>
                      <td>
                        {n.orderId ? (
                          <Link to={`/orders/${n.orderId}`} className="num text-accent hover:underline">
                            {n.orderCode}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-muted-foreground">
                        <span className="block text-xs text-subtle-foreground">
                          {n.audience === "SHOP" ? "Cửa hàng" : "Khách"}
                        </span>
                        {n.recipient ?? "—"}
                      </td>
                      <td className="max-w-72">
                        <p className="line-clamp-2 text-foreground">{n.subject ?? "—"}</p>
                        {n.detail ? <p className="text-xs text-subtle-foreground">{n.detail}</p> : null}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                            STATUS[n.status].tone,
                          )}
                        >
                          {STATUS[n.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {error ? (
          <div className="border-t border-border p-5">
            <ErrorState
              message={error}
              action={
                <Button variant="outline" size="md" onClick={() => void load()}>
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : null}

        {!loading && data?.content.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState
              title="Chưa có thông báo nào"
              description="Đặt thử một đơn ở cửa hàng — email xác nhận sẽ xuất hiện ở đây sau vài giây."
            />
          </div>
        ) : null}

        {data && data.totalPages > 1 ? (
          <div className="border-t border-border px-5 py-4">
            <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
