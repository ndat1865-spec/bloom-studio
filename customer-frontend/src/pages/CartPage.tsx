import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Camera, Check, Clock, PenLine, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { CheckoutSteps } from "@/components/shop/CheckoutSteps";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { FREE_DELIVERY_THRESHOLD, useCart } from "@/context/CartContext";
import { api, type OrderOptions, type Product } from "@/lib/api";
import { describeDay, earliestDeliveryDate, formatDay } from "@/lib/delivery";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { flyToCart } from "@/lib/flyToCart";

/** So bo goi y them o cuoi trang. */
const SUGGESTION_LIMIT = 3;

/**
 * Gio hoa — PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Nguyen tac thiet ke (xem docs/prompt-redesign-commerce-screens.md):
 *  - Anh bo hoa lon: thuong hieu nay song bang anh
 *  - Cum thao tac don ve ben phai thay vi rai deu ca chieu ngang
 *  - Nut xoa la icon lang, de "Chon ngay giao & dat hoa" la hanh dong noi bat DUY NHAT
 *  - Khoi tom tat dung bac mau be mat, KHONG dung vien hop
 *
 * Khac gio hang cua shop ban le: moi dong noi ro co bo va bo do giao trong ngay hay phai dat
 * truoc; khoi tom tat bao ngay giao som nhat (theo gio chot don that cua studio).
 */
export default function CartPage() {
  const { lines, count, subtotal, deliveryFee, total, add, setQuantity, remove } = useCart();
  const [options, setOptions] = useState<OrderOptions | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [justAdded, setJustAdded] = useState<number | null>(null);

  const missingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const leadDays = lines.reduce((max, line) => Math.max(max, line.leadDays ?? 0), 0);
  const earliest = options ? earliestDeliveryDate(options, leadDays) : null;

  // Gio chot don + vung giao: loi thi chi mat dong "giao som nhat"
  useEffect(() => {
    const controller = new AbortController();
    api.getOrderOptions(controller.signal).then(setOptions).catch(() => setOptions(null));
    return () => controller.abort();
  }, []);

  /*
    Goi y: bo con hang, giao trong ngay, chua co trong gio. Uu tien bo co danh gia, roi bo
    co gia gan muc khach dang chon - khong goi y bo 7 trieu canh gio 500 nghin.
  */
  const inCart = useMemo(() => new Set(lines.map((l) => l.productId).filter((id) => id != null)), [lines]);
  const avgPrice = lines.length ? lines.reduce((sum, l) => sum + l.price, 0) / lines.length : 0;
  useEffect(() => {
    const controller = new AbortController();
    api
      .listProducts({ page: 0, size: 24, sort: "ratingAverage,desc" }, controller.signal)
      .then((page) => setSuggestions(page.content))
      .catch(() => setSuggestions([]));
    return () => controller.abort();
  }, []);
  const picks = suggestions
    .filter((p) => !inCart.has(p.id) && p.stockQuantity > 0 && (p.leadDays ?? 0) === 0)
    .sort(
      (a, b) =>
        Number(b.ratingCount > 0) - Number(a.ratingCount > 0) ||
        Math.abs(a.price - avgPrice) - Math.abs(b.price - avgPrice),
    )
    .slice(0, SUGGESTION_LIMIT);

  return (
    <div className="shell page-pad">
      <header>
        <p className="label-micro text-accent">Giỏ hoa</p>
        <h1 className="display-section mt-5 text-foreground">Hoa bạn đã chọn</h1>
        <span aria-hidden="true" className="mt-6 block h-px w-28 bg-accent" />
        {lines.length > 0 ? <CheckoutSteps current={0} /> : null}
      </header>

      {lines.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="Giỏ hoa đang trống"
            description="Chưa có bó hoa nào trong giỏ. Chọn theo dịp tặng, hoặc nhờ studio làm riêng một bó cho bạn."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="primary" size="lg" asChild>
                  <Link to="/products">Xem mẫu hoa →</Link>
                </Button>
                <Button variant="ghost" size="lg" asChild>
                  <Link to="/dat-hoa-theo-yeu-cau">Đặt theo yêu cầu</Link>
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[1fr_21rem]">
          {/* ---------- Danh sach bo hoa ---------- */}
          <section aria-labelledby="cart-lines-heading">
            <div className="flex items-baseline justify-between border-b border-border pb-4">
              <h2 id="cart-lines-heading" className="label-micro text-muted-foreground">
                Bó hoa
              </h2>
              <p className="num label-micro text-muted-foreground">{count} bó</p>
            </div>

            <ul>
              {lines.map((line) => {
                // Hoa theo yeu cau khong co trang san pham: dan ve trang yeu cau cua toi
                const custom = line.customRequestId != null;
                const href = line.productId != null ? `/products/${line.productId}` : "/tai-khoan/yeu-cau-dat-hoa";
                return (
                  /*
                    Hang ngang chi bat tu XL (1280px) tro len: tai 1024px khoi tom tat ben phai
                    cat cot trai con ~560px, ten bo hoa se vo nhieu dong.
                  */
                  <li
                    key={line.key}
                    className="group flex flex-col gap-5 border-b border-border py-7 xl:flex-row xl:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-5 sm:gap-7">
                      <Link
                        to={href}
                        className="block shrink-0 overflow-hidden bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <img
                          src={resolveImageUrl(line.imageUrl)}
                          alt={line.name}
                          onError={(event) => {
                            const img = event.currentTarget;
                            if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                          }}
                          className="aspect-[4/5] w-24 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05] sm:w-32"
                        />
                      </Link>

                      <div className="min-w-0 flex-1 pt-1">
                        <h3 className="font-display text-2xl font-semibold italic leading-snug text-foreground">
                          <Link to={href} className="transition-colors hover:text-accent">
                            {line.name}
                          </Link>
                        </h3>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {line.sizeLabel ? (
                            <span className="inline-flex items-center rounded-full border border-border-strong px-3 py-1 text-xs text-foreground">
                              {custom ? line.sizeLabel : `Cỡ ${line.sizeLabel}`}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5 text-xs text-accent">
                            <Clock className="size-3.5" aria-hidden="true" />
                            {custom
                              ? "Bó làm riêng · cần 1 ngày"
                              : line.leadDays > 0
                                ? `Đặt trước ${line.leadDays} ngày`
                                : "Giao được trong ngày"}
                          </span>
                        </div>

                        <p className="num mt-3 text-sm text-muted-foreground">
                          {formatPrice(line.price)} / bó
                          {!custom && line.productId != null ? (
                            <>
                              {" · "}
                              <Link
                                to={href}
                                className="text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                              >
                                Đổi cỡ
                              </Link>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>

                    {/* Cum thao tac: don chat ve ben phai */}
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:gap-7 sm:pl-[9.75rem] xl:justify-end xl:pl-0">
                      {custom ? (
                        <p className="label-micro whitespace-nowrap text-muted-foreground">Làm riêng · 1 bó</p>
                      ) : (
                        <QuantityStepper
                          id={`qty-${line.key}`}
                          value={line.quantity}
                          onChange={(next) => setQuantity(line.key, next)}
                          label={`Số bó ${line.name}`}
                        />
                      )}

                      <p className="num w-28 shrink-0 text-right font-display text-xl font-semibold italic text-foreground">
                        {formatPrice(line.price * line.quantity)}
                      </p>

                      <button
                        type="button"
                        onClick={() => remove(line.key)}
                        aria-label={`Xoá ${line.name} khỏi giỏ hoa`}
                        className="inline-flex size-10 shrink-0 items-center justify-center text-muted-foreground/50 transition-colors hover:text-danger focus-visible:text-danger focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Link
              to="/products"
              className="label-micro mt-7 inline-block text-muted-foreground transition-colors hover:text-accent"
            >
              ← Tiếp tục chọn hoa
            </Link>

            {/* ---------- Goi y them ---------- */}
            {picks.length > 0 ? (
              <section aria-labelledby="cart-suggest-heading" className="mt-16">
                <h2
                  id="cart-suggest-heading"
                  className="font-display text-2xl font-semibold italic text-foreground"
                >
                  Có thể bạn cũng thích
                </h2>
                <p className="mt-2 text-sm font-light text-muted-foreground">
                  Những bó được khách đánh giá cao, giao được ngay trong ngày.
                </p>
                <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {picks.map((p) => {
                    const prices = (p.sizes ?? []).map((s) => s.price);
                    const from = prices.length ? Math.min(...prices) : p.price;
                    return (
                      <li key={p.id} className="group flex flex-col bg-surface">
                        <Link to={`/products/${p.id}`} className="block overflow-hidden">
                          <img
                            src={resolveImageUrl(p.imageUrl)}
                            alt={p.name}
                            loading="lazy"
                            onError={(event) => {
                              const img = event.currentTarget;
                              if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                            }}
                            className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          />
                        </Link>
                        <div className="flex flex-1 flex-col p-4">
                          <Link
                            to={`/products/${p.id}`}
                            className="font-display text-lg font-semibold italic leading-snug text-foreground transition-colors hover:text-accent"
                          >
                            {p.name}
                          </Link>
                          <p className="num mt-1 text-xs text-muted-foreground">
                            {p.sized ? "Từ " : ""}
                            {formatPrice(from)}
                            {p.stemCount ? ` · ${p.stemCount} bông` : ""}
                          </p>
                          <button
                            type="button"
                            onClick={(event) => {
                              const source = event.currentTarget.closest("li")?.querySelector("img");
                              void flyToCart(source, resolveImageUrl(p.imageUrl)).then(() => add(p, 1));
                              setJustAdded(p.id);
                            }}
                            className="label-micro mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-accent transition-colors hover:text-accent-strong"
                          >
                            {justAdded === p.id ? (
                              <Check className="size-3.5" aria-hidden="true" />
                            ) : (
                              <Plus className="size-3.5" aria-hidden="true" />
                            )}
                            {justAdded === p.id ? "Đã thêm" : "Thêm vào giỏ"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </section>

          {/* ---------- Tom tat: bac mau be mat, khong vien hop ---------- */}
          <aside aria-labelledby="cart-summary-heading" className="lg:sticky lg:top-28 lg:self-start">
            <div className="bg-surface p-7">
              <h2 id="cart-summary-heading" className="label-micro text-accent">
                Tóm tắt đơn
              </h2>

              <dl className="mt-6 space-y-3.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tiền hoa</dt>
                  <dd className="num text-foreground">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Phí giao hàng</dt>
                  {/* Phi GHN phu thuoc dia chi — chi biet o buoc dat hoa */}
                  <dd className="text-right text-foreground">
                    {deliveryFee === 0 ? "Miễn phí" : "Tính theo địa chỉ"}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex items-baseline justify-between border-t border-border-strong/40 pt-5">
                <span className="label-micro text-muted-foreground">
                  {deliveryFee === 0 ? "Tổng cộng" : "Tạm tính"}
                </span>
                <span className="num font-display text-3xl font-semibold italic text-accent">
                  {formatPrice(deliveryFee === 0 ? total : subtotal)}
                </span>
              </div>

              {/* Ngay giao som nhat: dieu nguoi dat hoa tang can biet truoc khi bam dat */}
              {options && earliest ? (
                <div className="mt-6 flex items-start gap-3 bg-background/60 px-4 py-3.5">
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <p className="text-sm leading-relaxed text-foreground">
                    Giao sớm nhất <span className="text-accent">{describeDay(options, earliest)}</span>
                    {earliest !== options.today ? `, ${formatDay(earliest)}` : ""}
                    <span className="mt-0.5 block text-xs font-light text-muted-foreground">
                      {leadDays > 0
                        ? `Giỏ có bó cần đặt trước ${leadDays} ngày.`
                        : options.sameDayOpen
                          ? `Đặt trước ${options.sameDayCutoffHour}:00 để giao hôm nay.`
                          : `Đơn hôm nay đã chốt lúc ${options.sameDayCutoffHour}:00.`}{" "}
                      Chọn ngày và khung giờ ở bước sau.
                    </span>
                  </p>
                </div>
              ) : null}

              {/*
                Tien do toi nguong mien phi giao hang. Da dat duoc thi doi sang loi xac nhan,
                khong bay thanh day 100% vo nghia.
              */}
              {missingForFreeDelivery > 0 ? (
                <div className="mt-6">
                  <div
                    className="h-0.5 w-full overflow-hidden bg-border"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={FREE_DELIVERY_THRESHOLD}
                    aria-valuenow={Math.round(subtotal)}
                    aria-label="Tiến độ tới mức miễn phí giao hàng"
                  >
                    <span
                      className="block h-full bg-accent transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-light leading-relaxed text-muted-foreground">
                    Thêm <span className="num text-accent">{formatPrice(missingForFreeDelivery)}</span> để được
                    miễn phí giao hàng.
                  </p>
                </div>
              ) : (
                <p className="mt-6 flex items-center gap-2 text-xs font-light text-success">
                  <Check className="size-3.5 shrink-0" aria-hidden="true" />
                  Đơn này được miễn phí giao hàng.
                </p>
              )}

              <Button variant="primary" size="lg" className="mt-7 w-full" asChild>
                <Link to="/checkout">Chọn ngày giao &amp; đặt hoa →</Link>
              </Button>

              <ul className="mt-7 space-y-3 border-t border-border pt-6 text-xs font-light text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <PenLine className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                  Thiệp lời chúc, giấu tên người tặng ở bước sau
                </li>
                <li className="flex items-center gap-2.5">
                  <Camera className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                  Ảnh bó hoa thật gửi bạn trước khi giao
                </li>
                <li className="flex items-center gap-2.5">
                  <Wallet className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
                  Trả khi nhận hoa, hoặc VNPay · MoMo · ZaloPay
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
