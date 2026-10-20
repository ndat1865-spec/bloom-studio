import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, NativeSelect } from "@/components/ui/field";
import { EmptyState, ErrorState, ProductCardSkeleton, Spinner } from "@/components/ui/feedback";
import { ProductCard } from "@/components/shop/ProductCard";
import { Pagination } from "@/components/shop/Pagination";
import { api, type Category, type ProductAttributes } from "@/lib/api";
import { useDebounced, useProducts } from "@/lib/useProducts";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

const SORTS = [
  { value: "", label: "Sắp xếp…" },
  { value: "name,asc", label: "Tên A–Z" },
  { value: "name,desc", label: "Tên Z–A" },
  { value: "price,asc", label: "Giá tăng dần" },
  { value: "price,desc", label: "Giá giảm dần" },
  { value: "ratingAverage,desc", label: "Đánh giá cao nhất" },
];

/** Khoang gia dung san. Khoa URL dang "min-max", bo trong mot dau = khong gioi han. */
const PRICE_RANGES = [
  { value: "", label: "Mọi mức giá" },
  { value: "0-600000", label: "Dưới 600.000₫" },
  { value: "600000-1000000", label: "600.000₫ – 1 triệu" },
  { value: "1000000-3000000", label: "1 – 3 triệu" },
  { value: "3000000-", label: "Trên 3 triệu" },
];

function parsePriceRange(value: string | null): { minPrice: number | null; maxPrice: number | null } {
  if (!value) return { minPrice: null, maxPrice: null };
  const [min, max] = value.split("-");
  return {
    minPrice: min ? Number(min) : null,
    maxPrice: max ? Number(max) : null,
  };
}

/**
 * SOS08 — danh sach hoa cho CUSTOMER.
 * Tim kiem (debounce), loc danh muc, sap xep va phan trang deu goi API that.
 * Doi tim kiem / sap xep / danh muc -> quay ve trang 0.
 */
export default function ProductsPage() {
  const [params, setParams] = useSearchParams();

  const page = Math.max(0, Number(params.get("page") ?? "0") || 0);
  const sort = params.get("sort") ?? "";
  const categoryParam = params.get("category");
  const categoryId = categoryParam ? Number(categoryParam) : null;
  const occasion = params.get("occasion");
  const color = params.get("color");
  const priceParam = params.get("price");
  const { minPrice, maxPrice } = parsePriceRange(priceParam);

  const [search, setSearch] = useState(params.get("name") ?? "");
  const debouncedSearch = useDebounced(search);

  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<ProductAttributes>({ occasions: [], colors: [] });

  // Dong bo o tim kiem (da debounce) vao URL, dong thoi dat lai page = 0
  useEffect(() => {
    const current = params.get("name") ?? "";
    if (current === debouncedSearch) return;
    const next = new URLSearchParams(params);
    if (debouncedSearch.trim()) next.set("name", debouncedSearch.trim());
    else next.delete("name");
    next.set("page", "0");
    setParams(next, { replace: true });
    // params/setParams on dinh trong vong doi cua router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listCategories(controller.signal)
      .then(setCategories)
      .catch(() => setCategories([]));
    // Danh sach dip va mau do backend cap — bo loc chi la phan them, loi thi an di
    api
      .getProductAttributes(controller.signal)
      .then(setAttributes)
      .catch(() => setAttributes({ occasions: [], colors: [] }));
    return () => controller.abort();
  }, []);

  const query = useMemo(
    () => ({
      name: params.get("name") ?? "",
      categoryId,
      occasion,
      color,
      minPrice,
      maxPrice,
      page,
      size: PAGE_SIZE,
      sort,
    }),
    [params, categoryId, occasion, color, minPrice, maxPrice, page, sort],
  );

  const { data, loading, error, reload } = useProducts(query);

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "0"); // doi bo loc -> ve trang dau
    setParams(next, { replace: true });
  }

  function goToPage(nextPage: number) {
    updateParam("page", String(nextPage));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /*
    So tren tab lay tu API danh muc (tong ca kho), KHONG lay tu ket qua dang loc —
    neu khong, chon mot danh muc xong thi tab "Tat ca" se hien so cua rieng danh muc do.
  */
  const totalInCatalogue = categories.reduce((sum, category) => sum + category.productCount, 0);
  const hasFilters = Boolean(
    params.get("name") || categoryParam || sort || occasion || color || priceParam,
  );

  return (
    <div className="shell page-pad">
      {/*
        Tieu de xep HAI COT tu lg tro len: mo ta nam ben phai, ngang hang chan chu
        "Arrangements", thay vi chong them mot khoi chu nua ben duoi.
        Truoc day rieng phan tieu de + thanh loc day san pham dau tien xuong tan
        y=625 tren man cao 768 — nguoi xem mo trang ra gan nhu khong thay bo hoa nao.
      */}
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <div>
          <p className="label-micro text-accent">Mẫu hoa · Giao trong ngày</p>
          <h1 className="display-section mt-4 text-foreground">Chọn một bó hoa</h1>
          <span aria-hidden="true" className="mt-5 block h-px w-28 bg-accent" />
        </div>

        <p className="max-w-md text-sm font-light leading-relaxed text-muted-foreground lg:pb-1.5 lg:text-right">
          Cắm tươi trong studio, đặt trước 15:00 là giao ngay hôm nay trong nội thành Hà Nội. Miễn
          phí giao cho đơn từ 800.000₫. Không thấy mẫu ưng ý?{" "}
          <Link to="/dat-hoa-theo-yeu-cau" className="text-accent hover:text-accent-strong">
            Đặt theo yêu cầu
          </Link>
          .
        </p>
      </header>

      {/*
        ---------- Thanh cong cu ----------
        Bo ba o vien hop xep canh nhau (nhin nhu form quan tri) va thay bang:
         - O tim kiem dang GACH CHAN, khong vien hop — dung tinh than "khong dung vien hop"
           cua DESIGN.md, va de o tim kiem la thu noi bat nhat hang tren.
         - Danh muc chuyen tu <select> thanh HANG TAB: chi co vai danh muc nen giau chung
           trong dropdown la phi — bay ra thi khach thay ngay va bam mot phat la xong.
         - Sap xep van la <select> that vi day dung la "chon 1 trong 5", va no can it cho.
      */}
      <div className="mt-9 border-t border-border pt-6">
        {/* Hang 1: tim kiem (chinh) + sap xep (phu) */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-10">
          <div className="min-w-0 flex-1">
            <Label htmlFor="product-search" className="mb-3 block">
              Tìm theo tên
            </Label>
            {/* group: icon va gach chan cung sang len khi con tro vao trong o */}
            <div className="group relative">
              <Search
                className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent"
                aria-hidden="true"
              />
              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="rose, dahlia, peony…"
                /*
                  Dung <input> thuan thay vi component Input: o nay co icon kinh lup
                  chen ben trai va co chu display nghieng rieng de noi bat hon cac o khac.
                  Phan gach chan thi giong het kieu chung.
                */
                className="w-full rounded-none border-0 border-b border-border-strong bg-transparent py-3 pl-7 pr-3 font-display text-lg italic text-foreground transition-colors placeholder:font-sans placeholder:text-base placeholder:not-italic placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
              />
            </div>
          </div>

          <div className="sm:w-52">
            <Label htmlFor="product-sort" className="mb-3 block">
              Sắp xếp
            </Label>
            <NativeSelect
              id="product-sort"
              value={sort}
              onChange={(event) => updateParam("sort", event.target.value || null)}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/*
          Hang loc theo dip: nut bam dang vien thuoc, vi voi shop hoa khach tim theo DIP
          (sinh nhat, khai truong...) nhieu hon theo ten. Mau va gia la <select> vi it dung hon.
        */}
        {attributes.occasions.length > 0 ? (
          <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div role="group" aria-label="Lọc theo dịp" className="flex flex-wrap gap-2">
              <OccasionChip
                label="Mọi dịp"
                active={!occasion}
                onClick={() => updateParam("occasion", null)}
              />
              {attributes.occasions.map((option) => (
                <OccasionChip
                  key={option.value}
                  label={option.label}
                  active={occasion === option.value}
                  onClick={() =>
                    updateParam("occasion", occasion === option.value ? null : option.value)
                  }
                />
              ))}
            </div>

            <div className="flex gap-4">
              <div className="w-40">
                <Label htmlFor="product-color" className="sr-only">
                  Màu hoa
                </Label>
                <NativeSelect
                  id="product-color"
                  value={color ?? ""}
                  onChange={(event) => updateParam("color", event.target.value || null)}
                >
                  <option value="">Mọi màu</option>
                  {attributes.colors.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="w-40">
                <Label htmlFor="product-price" className="sr-only">
                  Khoảng giá
                </Label>
                <NativeSelect
                  id="product-price"
                  value={priceParam ?? ""}
                  onChange={(event) => updateParam("price", event.target.value || null)}
                >
                  {PRICE_RANGES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </div>
        ) : null}

        {/* Hang 2: danh muc dang tab, cuon ngang duoc tren dien thoai */}
        <div className="mt-7">
          {/*
            Nhan "Danh muc" chi con cho trinh doc man hinh: hang tab ngay ben duoi
            da tu noi len no la gi, ma mot dong chu nua thi ton them ~36px chieu cao.
          */}
          <p id="category-label" className="sr-only">
            Danh mục
          </p>
          {/*
            Hang tab va dong "N san pham" dung CHUNG mot hang: truoc day dong trang thai
            chiem rieng mot hang nua, day luoi hoa xuong them ~45px ma khong them thong tin.
            Chi rieng dai tab cuon ngang; dong trang thai o ngoai nen khong bi cuon mat.
          */}
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border">
            <div
              role="group"
              aria-labelledby="category-label"
              className="-mb-px flex gap-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <CategoryTab
                label="Tất cả"
                count={totalInCatalogue}
                active={categoryId === null}
                onClick={() => updateParam("category", null)}
              />
              {categories.map((category) => (
                <CategoryTab
                  key={category.id}
                  label={category.name}
                  count={category.productCount}
                  active={categoryId === category.id}
                  onClick={() => updateParam("category", String(category.id))}
                />
              ))}
            </div>

            {/* Dong trang thai — luon co chu, khong chi dua vao mau */}
            <div
              className="flex min-h-6 shrink-0 flex-wrap items-center gap-x-6 gap-y-2 pb-4"
              aria-live="polite"
            >
              {loading ? (
                <Spinner label="Đang tải hoa từ API…" />
              ) : data ? (
                <p className="num text-xs text-muted-foreground">
                  {data.totalElements} sản phẩm
                  {data.totalPages > 0 ? ` · trang ${data.number + 1}/${data.totalPages}` : ""}
                </p>
              ) : null}

              {hasFilters ? (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setParams(new URLSearchParams(), { replace: true })}
                >
                  Xoá bộ lọc
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Ket qua */}
      <div className="mt-8">
        {loading && !data ? (
          <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <li key={index}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        ) : error ? (
          <ErrorState
            message={error}
            action={
              <Button variant="outline" size="md" onClick={reload}>
                Thử lại
              </Button>
            }
          />
        ) : data && data.content.length === 0 ? (
          <EmptyState
            title="Không có kết quả"
            description="Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại. Thử một từ khoá ngắn hơn hoặc bỏ bớt bộ lọc."
            action={
              <Button variant="outline" size="md" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                Xoá bộ lọc
              </Button>
            }
          />
        ) : data ? (
          <ul
            className={`grid grid-cols-1 gap-0.5 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${
              loading ? "opacity-60" : "opacity-100"
            }`}
          >
            {data.content.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {data ? <Pagination page={data.number} totalPages={data.totalPages} onChange={goToPage} /> : null}
    </div>
  );
}

/**
 * Mot tab danh muc. Trang thai chon KHONG chi dua vao mau:
 * co ca gach chan dam va aria-pressed cho trinh doc man hinh.
 */
function CategoryTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group shrink-0 whitespace-nowrap border-b-2 pb-4 transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-accent text-accent"
          : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      <span className="text-sm font-light">{label}</span>
      {count != null ? (
        <span
          className={cn(
            "num ml-2 text-xs transition-colors",
            active ? "text-accent/70" : "text-muted-foreground/50",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Nut chon dip. Trang thai chon co ca mau nen, vien va aria-pressed. */
function OccasionChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-xs transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-accent bg-accent text-background"
          : "border-border-strong text-muted-foreground hover:border-accent hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
