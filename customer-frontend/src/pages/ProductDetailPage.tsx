import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Camera, Flower, MapPin, PenLine, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, Notice, Skeleton } from "@/components/ui/feedback";
import {
  ApiError,
  api,
  type OrderOptions,
  type Product,
  type ProductAttributes,
} from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { describeDay, earliestDeliveryDate } from "@/lib/delivery";
import { flyToCart } from "@/lib/flyToCart";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductReviews } from "@/components/shop/ProductReviews";
import { useCart } from "@/context/CartContext";

/** Bao nhieu bo cung danh muc gioi thieu o cuoi trang. */
const RELATED_LIMIT = 3;

/** Trang chi tiet mot bo hoa — su dung GET /api/products/{id}. */
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("STANDARD");
  const [added, setAdded] = useState<string | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [attributes, setAttributes] = useState<ProductAttributes | null>(null);
  const [options, setOptions] = useState<OrderOptions | null>(null);
  const { add } = useCart();

  // Nhan tieng Viet cho ma dip / mau. Loi thi chi mat dong nhan, trang van hien.
  useEffect(() => {
    const controller = new AbortController();
    api
      .getProductAttributes(controller.signal)
      .then(setAttributes)
      .catch(() => setAttributes(null));
    return () => controller.abort();
  }, []);

  // Gio chot don + vung giao: loi thi chi mat dong "giao som nhat", van dat hoa duoc.
  useEffect(() => {
    const controller = new AbortController();
    api
      .getOrderOptions(controller.signal)
      .then(setOptions)
      .catch(() => setOptions(null));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setError("Mã sản phẩm không hợp lệ.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setQuantity(1);
    setSize("STANDARD");
    setAdded(null);
    setRelated([]);

    api
      .getProduct(numericId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setProduct(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "Không tìm thấy bó hoa này."
            : err instanceof Error
              ? err.message
              : "Không tải được bó hoa.",
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  /*
    Goi y cung danh muc. Tach thanh effect rieng de neu API nay hong
    thi phan chinh cua trang van hien binh thuong — day chi la phan them.
    Lay du RELATED_LIMIT + 1 vi con phai loai chinh san pham dang xem ra.
  */
  const categoryId = product?.category?.id ?? null;
  const productId = product?.id ?? null;

  useEffect(() => {
    if (categoryId == null || productId == null) return;
    const controller = new AbortController();

    api
      .listProducts({ categoryId, page: 0, size: RELATED_LIMIT + 1 }, controller.signal)
      .then((page) =>
        setRelated(page.content.filter((item) => item.id !== productId).slice(0, RELATED_LIMIT)),
      )
      .catch(() => setRelated([]));

    return () => controller.abort();
  }, [categoryId, productId]);

  const sizes = product?.sizes ?? [];
  const selected = sizes.find((s) => s.code === size) ?? sizes[0] ?? null;
  const unitPrice = selected?.price ?? product?.price ?? 0;
  const soldOut = product != null && product.stockQuantity <= 0;
  const leadDays = product?.leadDays ?? 0;
  const earliest = options ? earliestDeliveryDate(options, leadDays) : null;

  function orderNow() {
    if (!product) return;
    add(product, quantity, selected?.code);
    navigate("/checkout");
  }

  return (
    <div className="shell page-pad">
      <Button variant="link" size="sm" asChild className="mb-10">
        <Link to="/products">
          <ArrowLeft aria-hidden="true" />
          Quay lại danh sách hoa
        </Link>
      </Button>

      {loading ? (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="space-y-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      ) : error ? (
        <ErrorState
          message={error}
          action={
            <Button variant="outline" size="md" asChild>
              <Link to="/products">Về danh sách hoa</Link>
            </Button>
          }
        />
      ) : product ? (
        <>
          <article className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/*
              Anh DINH khi cuon: cot phai cao hon cot trai, neu anh cuon theo thi
              nua duoi ben trai bi bo trong mot khoang lon.
            */}
            <div className="lg:sticky lg:top-28">
              <div className="overflow-hidden bg-surface-raised">
                <img
                  src={resolveImageUrl(product.imageUrl)}
                  alt={product.name}
                  onError={(event) => {
                    const img = event.currentTarget;
                    if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                  }}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.04]"
                />
              </div>
              <p className="mt-3 text-xs font-light text-muted-foreground">
                Ảnh minh hoạ. Hoa theo mùa có thể khác đôi chút — studio gửi ảnh bó thật trước khi giao.
              </p>
            </div>

            <div>
              <p className="label-micro text-accent">{product.category?.name ?? "Bó hoa"}</p>

              <h1 className="display-section mt-5 text-foreground">{product.name}</h1>
              <span aria-hidden="true" className="mt-6 block h-px w-28 bg-accent" />

              <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <p className="num font-display text-4xl font-semibold italic text-accent">
                  {formatPrice(unitPrice)}
                </p>
                {product.ratingCount > 0 && product.ratingAverage != null ? (
                  <a
                    href="#reviews-heading"
                    className="num inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent"
                  >
                    <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
                    <span className="text-foreground">{product.ratingAverage.toFixed(1)}</span>
                    <span>· {product.ratingCount} đánh giá</span>
                  </a>
                ) : null}
              </div>

              {/* Dip va mau: nhan bam duoc, dan ve danh sach da loc san */}
              {attributes && (product.occasions.length > 0 || product.color) ? (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label="Dịp và màu hoa">
                  {product.occasions.map((code) => (
                    <li key={code}>
                      <Link
                        to={`/products?occasion=${code}`}
                        className="inline-block rounded-full border border-border-strong px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        {attributes.occasions.find((o) => o.value === code)?.label ?? code}
                      </Link>
                    </li>
                  ))}
                  {product.color ? (
                    <li>
                      <Link
                        to={`/products?color=${product.color}`}
                        className="inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        Màu {(attributes.colors.find((c) => c.value === product.color)?.label ?? product.color).toLowerCase()}
                      </Link>
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {product.description ? (
                <p className="prose-measure mt-8 text-[1.0625rem] font-light leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : null}

              {/* ---------- Thanh phan: khach dat hoa can biet minh nhan duoc gi ---------- */}
              {product.composition ? (
                <div className="mt-8 border-l-2 border-accent pl-5">
                  <p className="label-micro text-muted-foreground">Trong bó có</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{product.composition}</p>
                </div>
              ) : null}

              {/*
                ---------- Dat bo nay ----------
                Dung bac mau be mat, KHONG vien hop — giong khoi tom tat o Gio hoa
                va Dat hoa, theo dung nguyen tac trong DESIGN.md.
              */}
              <div className="mt-10 bg-surface p-7">
                {added ? (
                  <Notice tone="success" className="mb-6">
                    {added}
                  </Notice>
                ) : null}

                {/* Chon co bo: cung cach phoi, khac so bong va gia */}
                {product.sized && sizes.length > 1 ? (
                  <fieldset className="mb-7">
                    <legend className="label-micro mb-3 text-muted-foreground">Chọn cỡ bó</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {sizes.map((option) => {
                        const active = option.code === selected?.code;
                        return (
                          <label
                            key={option.code}
                            className={cn(
                              "flex cursor-pointer flex-col items-center gap-1 border px-2 py-3 text-center transition-colors",
                              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                              active
                                ? "border-accent bg-background text-accent"
                                : "border-border text-muted-foreground hover:border-accent/60",
                            )}
                          >
                            <input
                              type="radio"
                              name="bouquet-size"
                              value={option.code}
                              checked={active}
                              onChange={() => setSize(option.code)}
                              className="sr-only"
                            />
                            <span className={cn("text-sm", active ? "text-accent" : "text-foreground")}>
                              {option.label}
                            </span>
                            {option.stems != null ? (
                              <span className="num text-xs">{option.stems} bông</span>
                            ) : null}
                            <span className="num text-xs">{formatPrice(option.price)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : product.stemCount != null ? (
                  <p className="mb-7 text-sm text-muted-foreground">
                    <span className="num text-foreground">{product.stemCount}</span> bông · một cỡ duy nhất
                  </p>
                ) : null}

                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <p className="label-micro mb-3 text-muted-foreground">Số bó</p>
                    <QuantityStepper
                      id="detail-quantity"
                      value={quantity}
                      onChange={setQuantity}
                      label={`Số bó ${product.name}`}
                    />
                  </div>

                  {/* Thanh tien chi dang len khi dat tu 2 bo tro len */}
                  {quantity > 1 ? (
                    <div className="text-right">
                      <p className="label-micro text-muted-foreground">Thành tiền</p>
                      <p className="num mt-2 font-display text-2xl font-semibold italic text-foreground">
                        {formatPrice(unitPrice * quantity)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Giao som nhat: dieu dau tien nguoi dat hoa tang can biet */}
                <p className="mt-6 flex items-start gap-2.5 text-sm text-foreground">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>
                    {soldOut
                      ? "Tạm hết hoa cho mẫu này — studio đang nhập thêm. Bạn có thể đặt hoa theo yêu cầu."
                      : !options || !earliest
                        ? "Chọn ngày và khung giờ giao ở bước đặt hoa."
                        : leadDays > 0
                          ? `Cần đặt trước ${leadDays} ngày · giao sớm nhất ${describeDay(options, earliest)}.`
                          : options.sameDayOpen
                            ? `Đặt trước ${options.sameDayCutoffHour}:00 hôm nay, hoa giao ngay trong ngày.`
                            : `Đã qua ${options.sameDayCutoffHour}:00 — giao sớm nhất ngày mai.`}
                  </span>
                </p>

                <Button
                  variant="primary"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={soldOut}
                  onClick={orderNow}
                >
                  <Flower aria-hidden="true" />
                  Đặt bó này
                </Button>

                {/* Duong lui de dang chu, khong phai nut to — "Dat bo nay" phai la CTA duy nhat */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => {
                      // Anh lon cua bo hoa bay vao gio, cham gio moi cong
                      const source = document.querySelector("article img");
                      const qty = quantity;
                      const code = selected?.code;
                      void flyToCart(source, resolveImageUrl(product.imageUrl)).then(() => add(product, qty, code));
                      setAdded(
                        `Đã thêm ${quantity} × ${product.name}${product.sized && selected ? ` (cỡ ${selected.label.toLowerCase()})` : ""} vào giỏ hoa.`,
                      );
                    }}
                    className="label-micro text-muted-foreground transition-colors hover:text-accent disabled:opacity-40"
                  >
                    Thêm vào giỏ, chọn thêm bó khác
                  </button>
                  <Link
                    to="/dat-hoa-theo-yeu-cau"
                    className="label-micro text-muted-foreground transition-colors hover:text-accent"
                  >
                    Muốn bó khác? Đặt theo yêu cầu →
                  </Link>
                </div>
              </div>

              {/* ---------- Cam ket cua tiem hoa ---------- */}
              <ul className="mt-10 grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
                <li className="bg-background px-5 py-6 text-center">
                  <MapPin className="mx-auto size-4 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-xs text-foreground">
                    Giao trong ngày {options?.deliveryAreaLabel ? `nội thành ${options.deliveryAreaLabel}` : "nội thành"}
                  </p>
                  <p className="mt-1.5 text-xs font-light text-muted-foreground">
                    Chọn khung giờ sáng, chiều hoặc tối
                  </p>
                </li>
                <li className="bg-background px-5 py-6 text-center">
                  <Camera className="mx-auto size-4 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-xs text-foreground">Ảnh bó thật trước khi giao</p>
                  <p className="mt-1.5 text-xs font-light text-muted-foreground">Gửi vào trang đơn và email</p>
                </li>
                <li className="bg-background px-5 py-6 text-center">
                  <PenLine className="mx-auto size-4 text-accent" aria-hidden="true" />
                  <p className="mt-3 text-xs text-foreground">Thiệp viết lời chúc</p>
                  <p className="mt-1.5 text-xs font-light text-muted-foreground">Có thể giấu tên người tặng</p>
                </li>
              </ul>

              <dl className="mt-10 border-t border-border">
                {product.stemCount != null ? (
                  <div className="flex justify-between gap-6 border-b border-border py-4">
                    <dt className="label-micro text-muted-foreground">Số bông (cỡ tiêu chuẩn)</dt>
                    <dd className="num text-sm text-foreground">{product.stemCount}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-6 border-b border-border py-4">
                  <dt className="label-micro text-muted-foreground">Đặt trước</dt>
                  <dd className="text-right text-sm text-foreground">
                    {leadDays > 0 ? `${leadDays} ngày` : "Giao được trong ngày"}
                  </dd>
                </div>
                <div className="flex justify-between gap-6 border-b border-border py-4">
                  <dt className="label-micro text-muted-foreground">Giao hàng</dt>
                  <dd className="text-right text-sm text-foreground">
                    {options?.deliveryAreaLabel ? `Nội thành ${options.deliveryAreaLabel} · ` : ""}
                    miễn phí từ {formatPrice(options?.freeDeliveryThreshold ?? 800_000)}
                  </dd>
                </div>
              </dl>
            </div>
          </article>

          <ProductReviews
            productId={product.id}
            onRatingChange={(ratingAverage, ratingCount) =>
              setProduct((current) => (current ? { ...current, ratingAverage, ratingCount } : current))
            }
          />

          {/*
            ---------- Cung danh muc ----------
            Truoc day trang ket thuc o bang thong so roi la mot khoang trong den footer:
            xem xong mot bo hoa thi khong con duong nao di tiep.
          */}
          {related.length > 0 ? (
            <section aria-labelledby="related-heading" className="mt-24 border-t border-border pt-12">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <p className="label-micro text-accent">Cùng danh mục</p>
                  <h2
                    id="related-heading"
                    className="mt-4 font-display text-3xl font-semibold italic text-foreground"
                  >
                    Có thể bạn cũng thích
                  </h2>
                </div>
                <Link
                  to={`/products?category=${product.category?.id ?? ""}`}
                  className="label-micro text-muted-foreground transition-colors hover:text-accent"
                >
                  Xem tất cả →
                </Link>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
