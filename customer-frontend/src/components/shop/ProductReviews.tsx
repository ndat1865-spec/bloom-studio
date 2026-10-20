import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageSquareText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Notice, Skeleton } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  api,
  type Page,
  type Review,
  type ReviewEligibility,
  type ReviewSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

/**
 * Khoi danh gia o cuoi trang chi tiet san pham.
 *
 * Chi khach DA NHAN HANG moi viet duoc danh gia. Giao dien hoi truoc
 * (GET .../eligibility) de hien dung trang thai thay vi de khach go xong moi bao loi:
 *  - chua dang nhap       -> moi dang nhap
 *  - chua mua / chua giao -> noi ro ly do backend tra ve
 *  - da danh gia          -> hien form da dien san de sua
 */
export function ProductReviews({
  productId,
  onRatingChange,
}: {
  productId: number;
  /** Bao cho trang cha cap nhat diem tren dau trang sau khi gui danh gia */
  onRatingChange?: (average: number | null, count: number) => void;
}) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Page<Review> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [nextSummary, firstPage] = await Promise.all([
          api.getReviewSummary(productId, signal),
          api.listReviews(productId, 0, PAGE_SIZE, signal),
        ]);
        setSummary(nextSummary);
        setReviews(firstPage);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Không tải được đánh giá.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [productId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Chi hoi quyen danh gia khi da dang nhap — endpoint nay can token
  useEffect(() => {
    setEligibility(null);
    setEligibilityError(null);
    if (!user) return;
    const controller = new AbortController();
    api
      .getReviewEligibility(productId, controller.signal)
      .then(setEligibility)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setEligibilityError(err instanceof Error ? err.message : "Không kiểm tra được quyền đánh giá.");
      });
    return () => controller.abort();
  }, [productId, user]);

  async function loadMore() {
    if (!reviews || reviews.last) return;
    setLoadingMore(true);
    try {
      const next = await api.listReviews(productId, reviews.number + 1, PAGE_SIZE);
      setReviews({ ...next, content: [...reviews.content, ...next.content] });
    } catch {
      /* giu nguyen danh sach dang co */
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSaved(saved: Review) {
    setEligibility({ canReview: true, reason: null, myReview: saved });
    await load();
    const product = await api.getProduct(productId).catch(() => null);
    if (product) onRatingChange?.(product.ratingAverage, product.ratingCount);
  }

  return (
    <section aria-labelledby="reviews-heading" className="mt-24 border-t border-border pt-12">
      <p className="label-micro text-accent">Khách hàng nói gì</p>
      <h2
        id="reviews-heading"
        className="mt-4 font-display text-3xl font-semibold italic text-foreground"
      >
        Đánh giá
      </h2>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[20rem_1fr]">
        {/* ---------- Tom tat diem + form ---------- */}
        <div className="space-y-8">
          {loading && !summary ? (
            <Skeleton className="h-40 w-full" />
          ) : summary ? (
            <RatingSummary summary={summary} />
          ) : null}

          {!user ? (
            <p className="text-sm font-light leading-relaxed text-muted-foreground">
              <Link to="/login" className="text-accent hover:text-accent-strong">
                Đăng nhập
              </Link>{" "}
              để viết đánh giá. Chỉ khách đã nhận được hoa mới đánh giá được.
            </p>
          ) : eligibilityError ? (
            <Notice tone="error">{eligibilityError}</Notice>
          ) : !eligibility ? (
            <Skeleton className="h-24 w-full" />
          ) : eligibility.canReview ? (
            <ReviewForm
              productId={productId}
              existing={eligibility.myReview}
              onSaved={handleSaved}
            />
          ) : (
            <p className="flex items-start gap-2.5 bg-surface p-5 text-sm font-light leading-relaxed text-muted-foreground">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              {eligibility.reason}
            </p>
          )}
        </div>

        {/* ---------- Danh sach ---------- */}
        <div>
          {error ? (
            <Notice tone="error">{error}</Notice>
          ) : loading && !reviews ? (
            <div className="space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : reviews && reviews.content.length === 0 ? (
            <p className="border border-dashed border-border px-6 py-12 text-center text-sm font-light text-muted-foreground">
              Chưa có đánh giá nào cho bó hoa này.
            </p>
          ) : reviews ? (
            <>
              <ul className="divide-y divide-border border-y border-border">
                {reviews.content.map((review) => (
                  <li key={review.id} className="py-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Stars value={review.rating} />
                      <p className="num text-xs text-muted-foreground">
                        {review.username} · {formatDate(review.createdAt)}
                      </p>
                    </div>
                    {review.comment ? (
                      <p className="prose-measure mt-3 text-[0.9375rem] font-light leading-relaxed text-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!reviews.last ? (
                <Button
                  variant="ghost"
                  size="md"
                  className="mt-6"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  Xem thêm đánh giá
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RatingSummary({ summary }: { summary: ReviewSummary }) {
  const max = Math.max(...Object.values(summary.counts), 1);
  return (
    <div className="bg-surface p-7">
      <div className="flex items-baseline gap-3">
        <p className="num font-display text-5xl font-semibold italic text-accent">
          {summary.average != null ? summary.average.toFixed(1) : "—"}
        </p>
        <p className="text-sm text-muted-foreground">/ 5</p>
      </div>
      <Stars value={summary.average ?? 0} className="mt-2" />
      <p className="num mt-2 text-xs text-muted-foreground">{summary.count} đánh giá</p>

      <ul className="mt-6 space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.counts[String(star)] ?? 0;
          return (
            <li key={star} className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="num w-8 shrink-0">{star} sao</span>
              <span className="h-1.5 flex-1 overflow-hidden bg-surface-raised">
                <span
                  className="block h-full bg-accent"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className="num w-6 shrink-0 text-right">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Hang sao chi de xem. Diem le (4.5) to nua sao bang cach xen mau bang clip. */
function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value.toFixed(1)} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className="relative inline-block size-4">
            <Star className="absolute inset-0 size-4 text-border-strong" aria-hidden="true" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

const RATING_LABELS = ["", "Tệ", "Chưa ổn", "Tạm được", "Đẹp", "Tuyệt vời"];

function ReviewForm({
  productId,
  existing,
  onSaved,
}: {
  productId: number;
  existing: Review | null;
  onSaved: (review: Review) => Promise<void>;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      setNotice({ tone: "error", text: "Chọn số sao trước khi gửi." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const saved = await api.submitReview(productId, rating, comment.trim() || null);
      setNotice({
        tone: "success",
        text: saved.hidden
          ? "Đã lưu. Đánh giá này đang bị ẩn bởi quản trị viên nên chưa hiện công khai."
          : existing
            ? "Đã cập nhật đánh giá của bạn."
            : "Cảm ơn bạn đã đánh giá!",
      });
      await onSaved(saved);
    } catch (err) {
      setNotice({
        tone: "error",
        text:
          err instanceof ApiError || err instanceof Error ? err.message : "Không gửi được đánh giá.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-surface p-7">
      <p className="label-micro text-muted-foreground">
        {existing ? "Đánh giá của bạn" : "Viết đánh giá"}
      </p>

      <fieldset className="mt-4">
        <legend className="sr-only">Số sao</legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className="cursor-pointer p-0.5">
              <input
                type="radio"
                name="rating"
                value={star}
                checked={rating === star}
                onChange={() => setRating(star)}
                className="peer sr-only"
              />
              <Star
                aria-hidden="true"
                className={cn(
                  "size-7 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                  star <= rating ? "fill-accent text-accent" : "text-border-strong hover:text-accent",
                )}
              />
              <span className="sr-only">{star} sao</span>
            </label>
          ))}
          <span className="ml-3 text-xs text-muted-foreground">{RATING_LABELS[rating]}</span>
        </div>
      </fieldset>

      <div className="mt-5">
        <Field id="review-comment" label="Nhận xét (không bắt buộc)">
          {(props) => (
            <Textarea
              {...props}
              maxLength={1000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Hoa có tươi không, giao có đúng giờ không…"
            />
          )}
        </Field>
      </div>

      {notice ? (
        <Notice tone={notice.tone} className="mt-5">
          {notice.text}
        </Notice>
      ) : null}

      <Button type="submit" variant="primary" size="md" className="mt-6 w-full" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {existing ? "Cập nhật đánh giá" : "Gửi đánh giá"}
      </Button>
    </form>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
