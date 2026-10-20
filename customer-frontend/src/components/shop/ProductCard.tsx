import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { Product } from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { AddToCartButton } from "./AddToCartButton";

/**
 * The san pham.
 *
 * Cau truc co y: KHONG boc ca the trong mot <Link>, vi nut "them vao gio" la mot <button>
 * va <button> long trong <a> la HTML khong hop le. Thay vao do:
 *   - the la mot khoi `relative`
 *   - lien ket phu kin the bang `after:absolute after:inset-0` (stretched link)
 *   - nut gio la phan tu ANH EM, `relative z-20` nen nam tren lop phu cua lien ket
 */
export function ProductCard({ product }: { product: Product }) {
  // Bo chia co: hien gia co nho nhat ("Tu ...") de khach khong tuong chi co mot muc gia
  const prices = (product.sizes ?? []).map((s) => s.price);
  const fromPrice = product.sized && prices.length > 1 ? Math.min(...prices) : null;
  const soldOut = product.stockQuantity <= 0;
  const leadDays = product.leadDays ?? 0;

  return (
    <article className="group relative flex h-full flex-col border border-border bg-surface transition-colors duration-200 hover:border-border-strong">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-raised">
        <img
          src={resolveImageUrl(product.imageUrl)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            const img = event.currentTarget;
            if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
          }}
          className="size-full object-cover transition-transform duration-500 ease-[var(--ease-entrance)] group-hover:scale-[1.03]"
        />

        {/* Nhan giao hang: dieu nguoi dat hoa tang can biet truoc tien */}
        <span
          className={
            "label-micro absolute right-3 top-3 z-20 rounded-chip px-2.5 py-1 " +
            (soldOut ? "bg-background/90 text-muted-foreground" : "bg-background/90 text-accent")
          }
        >
          {soldOut ? "Tạm hết hoa" : leadDays > 0 ? `Đặt trước ${leadDays} ngày` : "Giao trong ngày"}
        </span>

        {/*
          Nut tron them nhanh (co Tieu chuan) — chi cho bo hoa giao trong ngay.
          Hoa cuoi / su kien can chon ngay va doc ky truoc khi dat.
        */}
        {!soldOut && leadDays === 0 ? (
          <AddToCartButton product={product} className="absolute bottom-4 left-4" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="label-micro text-accent">
          {product.category?.name ?? "Bó hoa"}
          {product.stemCount != null ? (
            <span className="text-muted-foreground"> · {product.stemCount} bông</span>
          ) : null}
        </p>

        <h3 className="mt-3 font-display text-xl font-semibold italic leading-snug text-foreground transition-colors duration-200 group-hover:text-accent">
          <Link
            to={`/products/${product.id}`}
            className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {product.name}
          </Link>
        </h3>

        {product.description ? (
          <p className="mt-2.5 line-clamp-2 text-sm font-light leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-baseline justify-between gap-3 pt-5">
          <p className="num text-base font-medium text-foreground">
            {fromPrice != null ? (
              <>
                <span className="text-xs font-light text-muted-foreground">Từ </span>
                {formatPrice(fromPrice)}
              </>
            ) : (
              formatPrice(product.price)
            )}
          </p>
          {product.ratingCount > 0 && product.ratingAverage != null ? (
            <p className="num inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
              <span className="text-foreground">{product.ratingAverage.toFixed(1)}</span>
              <span>({product.ratingCount})</span>
              <span className="sr-only">
                điểm trung bình trên {product.ratingCount} đánh giá
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
