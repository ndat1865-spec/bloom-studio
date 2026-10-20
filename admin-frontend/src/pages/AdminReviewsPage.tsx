import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Notice, TableRowSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/shop/Pagination";
import { PageHeader } from "@/components/site/AdminShell";
import { api, type Page, type Review } from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const FILTERS: { key: string; label: string; hidden: boolean | undefined }[] = [
  { key: "all", label: "Tất cả", hidden: undefined },
  { key: "visible", label: "Đang hiện", hidden: false },
  { key: "hidden", label: "Đang ẩn", hidden: true },
];

/**
 * Duyet danh gia san pham. An danh gia thi no bien khoi trang san pham VA khong con
 * tinh vao diem trung binh; hien lai thi diem duoc tinh lai ngay.
 */
export default function AdminReviewsPage() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<Review> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Review | null>(null);

  const hidden = FILTERS.find((f) => f.key === filter)?.hidden;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.listAllReviews(hidden, page, PAGE_SIZE));
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Không tải được đánh giá.");
    } finally {
      setLoading(false);
    }
  }, [hidden, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleHidden(review: Review) {
    setWorkingId(review.id);
    setNotice(null);
    try {
      await api.setReviewHidden(review.id, !review.hidden);
      setNotice({
        tone: "success",
        text: review.hidden
          ? `Đã hiện lại đánh giá của ${review.username} cho "${review.productName}".`
          : `Đã ẩn đánh giá của ${review.username}. Điểm trung bình của "${review.productName}" được tính lại.`,
      });
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Không đổi được trạng thái." });
    } finally {
      setWorkingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setWorkingId(confirmTarget.id);
    try {
      await api.deleteReview(confirmTarget.id);
      setNotice({ tone: "success", text: `Đã xoá đánh giá của ${confirmTarget.username}.` });
      setConfirmTarget(null);
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Không xoá được đánh giá." });
      setConfirmTarget(null);
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Đánh giá sản phẩm"
        description="Chỉ khách đã nhận hàng mới đánh giá được. Ẩn đánh giá spam hoặc không phù hợp — đánh giá bị ẩn không tính vào điểm."
      />

      {notice ? (
        <Notice tone={notice.tone} className="mt-6">
          {notice.text}
        </Notice>
      ) : null}

      <section aria-labelledby="review-list-heading" className="card mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 id="review-list-heading" className="text-base text-foreground">
              Danh sách đánh giá
            </h2>
            {data ? <span className="num text-xs text-muted-foreground">{data.totalElements} đánh giá</span> : null}
          </div>
          <div role="group" aria-label="Lọc đánh giá" className="inline-flex rounded-[var(--radius-sm)] bg-background p-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => {
                  setFilter(item.key);
                  setPage(0);
                }}
                className={cn(
                  "h-7 rounded-[5px] px-3 text-[0.8125rem] transition-colors",
                  filter === item.key
                    ? "bg-surface-raised font-medium text-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[56rem]">
            <caption className="sr-only">Đánh giá với sản phẩm, khách, số sao, nội dung và trạng thái</caption>
            <thead>
              <tr>
                <th scope="col">Sản phẩm</th>
                <th scope="col">Khách</th>
                <th scope="col">Sao</th>
                <th scope="col">Nhận xét</th>
                <th scope="col">Ngày</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !data
                ? Array.from({ length: 4 }).map((_, index) => <TableRowSkeleton key={index} columns={7} />)
                : data?.content.map((review) => (
                    <tr key={review.id} className={review.hidden ? "opacity-60" : undefined}>
                      <td className="max-w-48 truncate font-medium text-foreground">{review.productName}</td>
                      <td className="text-muted-foreground">@{review.username}</td>
                      <td>
                        <span className="num inline-flex items-center gap-1 text-foreground">
                          <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
                          {review.rating}
                        </span>
                      </td>
                      <td className="max-w-80">
                        <p className="line-clamp-2 text-muted-foreground">
                          {review.comment ?? <span className="italic text-subtle-foreground">Không có nhận xét</span>}
                        </p>
                      </td>
                      <td className="num whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td>
                        <span
                          className={cn(
                            "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                            review.hidden
                              ? "bg-surface-raised text-muted-foreground ring-border"
                              : "bg-success/12 text-success ring-success/25",
                          )}
                        >
                          {review.hidden ? "Đang ẩn" : "Đang hiện"}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void toggleHidden(review)}
                            disabled={workingId === review.id}
                          >
                            {workingId === review.id ? (
                              <Loader2 className="animate-spin" aria-hidden="true" />
                            ) : review.hidden ? (
                              <Eye aria-hidden="true" />
                            ) : (
                              <EyeOff aria-hidden="true" />
                            )}
                            {review.hidden ? "Hiện" : "Ẩn"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-danger/10 hover:text-danger"
                            onClick={() => setConfirmTarget(review)}
                          >
                            <Trash2 aria-hidden="true" />
                            <span className="sr-only">Xoá đánh giá của {review.username}</span>
                          </Button>
                        </div>
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
              title={filter === "hidden" ? "Không có đánh giá nào đang ẩn" : "Chưa có đánh giá nào"}
              description="Khách chỉ đánh giá được sau khi đơn chứa sản phẩm đó chuyển sang Đã giao."
            />
          </div>
        ) : null}

        {data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <span className="num text-xs text-muted-foreground">
              Trang {data.number + 1} / {data.totalPages}
            </span>
            <Pagination page={data.number} totalPages={data.totalPages} onChange={setPage} label="Phân trang đánh giá" />
          </div>
        ) : null}
      </section>

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent
          open={confirmTarget !== null}
          title="Xoá đánh giá?"
          description={
            confirmTarget
              ? `Đánh giá ${confirmTarget.rating} sao của ${confirmTarget.username} cho "${confirmTarget.productName}" sẽ bị xoá hẳn và khách có thể viết lại. Nếu chỉ muốn giấu đi, hãy dùng Ẩn.`
              : undefined
          }
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setConfirmTarget(null)}>
                Huỷ
              </Button>
              <Button variant="danger" size="md" onClick={handleDelete} disabled={workingId !== null}>
                <Trash2 aria-hidden="true" />
                Xoá
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  );
}
