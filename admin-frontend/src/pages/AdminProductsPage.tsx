import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  CalendarClock,
  LayoutGrid,
  List,
  Loader2,
  PackageX,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, NativeSelect, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, ErrorState, Notice, TableRowSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/shop/Pagination";
import { PageHeader } from "@/components/site/AdminShell";
import {
  ApiError,
  api,
  type Category,
  type Product,
  type ProductAttributes,
  type ProductPayload,
} from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { useDebounced, useProducts } from "@/lib/useProducts";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const VIEW_KEY = "bloom_admin_products_view";

type StockFilter = "LOW" | "OUT" | null;

/** Kieu xem da chon lan truoc (luoi / bang) - chi la tien ich tren may nay. */
function readView(): "grid" | "table" {
  try {
    return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Duoi muc nay la "sap het hang" — chi de nhac, backend khong co khai niem nay. */
const LOW_STOCK = 10;

type FormState = {
  id: number | null;
  name: string;
  price: string;
  stockQuantity: string;
  description: string;
  categoryId: string;
  occasions: string[];
  color: string;
  composition: string;
  stemCount: string;
  sized: boolean;
  leadDays: string;
  /** Anh dang co cua san pham — de biet co giu anh cu hay khong khi sua */
  currentImageUrl: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  price: "",
  stockQuantity: "",
  description: "",
  categoryId: "",
  occasions: [],
  color: "",
  composition: "",
  stemCount: "",
  sized: false,
  leadDays: "0",
  currentImageUrl: null,
};

/**
 * SOS09 — trang quan tri san pham.
 *
 * Bang du lieu chiem tron chieu rong; bieu mau them/sua nam trong ngan keo ben phai.
 *
 * Luong luu: luu san pham truoc (POST/PUT) -> lay id -> neu co file thi upload anh.
 * KIEM TRA CA HAI request: neu luu thanh cong nhung upload that bai,
 * bao dung trang thai va cho thu lai rieng phan anh, khong bao "thanh cong" toan bo.
 */
export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<ProductAttributes>({ occasions: [], colors: [] });

  /** Ngan keo bieu mau dang mo hay dong */
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  /** San pham da luu nhung anh chua len duoc — cho phep thu lai rieng */
  const [pendingUpload, setPendingUpload] = useState<{ productId: number; file: File } | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"grid" | "table">(readView);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  // Loc ton kho: backend khong co tham so nay; danh muc cua studio nho (vai chuc bo) nen
  // loc tren ban day du tai mot lan o duoi
  const [stockFilter, setStockFilter] = useState<StockFilter>(null);
  const [allProducts, setAllProducts] = useState<Product[] | null>(null);
  const [statsKey, setStatsKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* che do rieng tu: bo qua */
    }
  }, [view]);

  // Doi tu khoa / danh muc -> ve trang 0
  useEffect(() => setPage(0), [debouncedSearch, categoryFilter]);

  const query = useMemo(
    () => ({ name: debouncedSearch, categoryId: categoryFilter, page, size: PAGE_SIZE, sort: "id,desc" }),
    [debouncedSearch, categoryFilter, page],
  );
  const { data, loading, error, reload: reloadPage } = useProducts(query);

  // Ban day du cho thong ke ton kho + loc "sap het / het hang"
  useEffect(() => {
    const controller = new AbortController();
    api
      .listProducts({ page: 0, size: 500, sort: "id,desc" }, controller.signal)
      .then((result) => setAllProducts(result.content))
      .catch(() => {
        if (!controller.signal.aborted) setAllProducts(null);
      });
    return () => controller.abort();
  }, [statsKey]);

  function reload() {
    reloadPage();
    setStatsKey((key) => key + 1);
  }

  const lowStock = allProducts?.filter((p) => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) < LOW_STOCK) ?? [];
  const outOfStock = allProducts?.filter((p) => (p.stockQuantity ?? 0) <= 0) ?? [];
  const occasionLabel = (code: string) => attributes.occasions.find((o) => o.value === code)?.label ?? code;

  // Dang loc ton kho: lay tu ban day du (van ap tu khoa + danh muc), khong phan trang
  const stockList = stockFilter
    ? (stockFilter === "LOW" ? lowStock : outOfStock).filter(
        (p) =>
          (!categoryFilter || p.category?.id === categoryFilter) &&
          (!debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase())),
      )
    : null;
  const shown = stockList ?? data?.content ?? null;
  const shownTotal = stockList ? stockList.length : data?.totalElements;

  useEffect(() => {
    const controller = new AbortController();
    api
      .listCategories(controller.signal)
      .then((list) => {
        setCategories(list);
        setCategoriesError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setCategoriesError(err instanceof Error ? err.message : "Không tải được danh mục.");
      });
    api
      .getProductAttributes(controller.signal)
      .then(setAttributes)
      .catch(() => setAttributes({ occasions: [], colors: [] }));
    return () => controller.abort();
  }, []);

  // Giai phong object URL cua anh xem truoc
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFile(null);
    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startCreate() {
    resetForm();
    setNotice(null);
    setFormOpen(true);
  }

  function startEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      price: String(product.price),
      stockQuantity: String(product.stockQuantity ?? 0),
      description: product.description ?? "",
      categoryId: product.category ? String(product.category.id) : "",
      occasions: product.occasions ?? [],
      color: product.color ?? "",
      composition: product.composition ?? "",
      stemCount: product.stemCount == null ? "" : String(product.stemCount),
      sized: product.sized ?? false,
      leadDays: String(product.leadDays ?? 0),
      currentImageUrl: product.imageUrl,
    });
    setFieldErrors({});
    setFile(null);
    setPendingUpload(null);
    setNotice(null);
    setFormOpen(true);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Nhập tên sản phẩm.";
    else if (form.name.trim().length > 100) next.name = "Tên tối đa 100 ký tự.";

    const price = Number(form.price);
    if (form.price.trim() === "") next.price = "Nhập giá.";
    else if (!Number.isFinite(price)) next.price = "Giá phải là số.";
    else if (price < 0) next.price = "Giá không được âm.";

    const stock = Number(form.stockQuantity);
    if (form.stockQuantity.trim() === "") next.stockQuantity = "Nhập số lượng tồn kho.";
    else if (!Number.isInteger(stock)) next.stockQuantity = "Tồn kho phải là số nguyên.";
    else if (stock < 0) next.stockQuantity = "Tồn kho không được âm.";

    if (!form.categoryId) next.categoryId = "Chọn danh mục.";

    if (form.stemCount.trim() !== "") {
      const stems = Number(form.stemCount);
      if (!Number.isInteger(stems) || stems < 1 || stems > 999) next.stemCount = "Số bông từ 1 đến 999.";
    } else if (form.sized) next.stemCount = "Bó chia cỡ cần số bông của cỡ tiêu chuẩn.";

    const lead = Number(form.leadDays);
    if (form.leadDays.trim() === "" || !Number.isInteger(lead) || lead < 0 || lead > 30)
      next.leadDays = "Số ngày đặt trước từ 0 đến 30.";
    if (form.composition.trim().length > 500) next.composition = "Thành phần tối đa 500 ký tự.";

    if (file) {
      if (file.size > MAX_IMAGE_BYTES) next.image = "Ảnh vượt quá 5MB.";
      else if (!/\.(jpe?g|png|webp|gif|avif)$/i.test(file.name))
        next.image = "Chỉ nhận ảnh jpg, jpeg, png, webp, gif, avif.";
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setPendingUpload(null);
    if (!validate()) return;

    const payload: ProductPayload = {
      name: form.name.trim(),
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity),
      description: form.description.trim(),
      category: { id: Number(form.categoryId) },
      occasions: form.occasions,
      color: form.color || null,
      composition: form.composition.trim() || null,
      stemCount: form.stemCount.trim() === "" ? null : Number(form.stemCount),
      sized: form.sized,
      leadDays: Number(form.leadDays),
    };

    setSaving(true);
    let saved: Product;
    try {
      saved = form.id
        ? await api.updateProduct(form.id, payload)
        : await api.createProduct(payload);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && err.fieldErrors) setFieldErrors(err.fieldErrors);
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Không lưu được sản phẩm.",
      });
      return;
    }

    // Buoc 2: upload anh (neu co chon file). Ket qua duoc kiem tra rieng.
    if (file) {
      try {
        await api.uploadProductImage(saved.id, file);
        setNotice({
          tone: "success",
          text: `Đã lưu "${saved.name}" và cập nhật ảnh.`,
        });
        resetForm();
        setFormOpen(false);
      } catch (err) {
        // Giu ngan keo mo de nguoi dung bam "Thu tai anh lai" ngay tai cho
        setPendingUpload({ productId: saved.id, file });
        setNotice({
          tone: "error",
          text: `Đã lưu "${saved.name}" (#${saved.id}) nhưng TẢI ẢNH THẤT BẠI: ${
            err instanceof Error ? err.message : "lỗi không xác định"
          }. Sản phẩm vẫn giữ ảnh cũ.`,
        });
      }
    } else {
      setNotice({
        tone: "success",
        text: form.id
          ? `Đã cập nhật "${saved.name}". Không chọn ảnh mới nên ảnh cũ được giữ nguyên.`
          : `Đã thêm "${saved.name}".`,
      });
      resetForm();
      setFormOpen(false);
    }

    setSaving(false);
    reload();
  }

  async function retryUpload() {
    if (!pendingUpload) return;
    setSaving(true);
    try {
      await api.uploadProductImage(pendingUpload.productId, pendingUpload.file);
      setNotice({ tone: "success", text: "Đã tải ảnh lên thành công." });
      setPendingUpload(null);
      resetForm();
      setFormOpen(false);
      reload();
    } catch (err) {
      setNotice({
        tone: "error",
        text: `Vẫn chưa tải được ảnh: ${err instanceof Error ? err.message : "lỗi không xác định"}`,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await api.deleteProduct(confirmTarget.id);
      setNotice({ tone: "success", text: `Đã xoá "${confirmTarget.name}".` });
      if (form.id === confirmTarget.id) resetForm();
      setConfirmTarget(null);
      reload();
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Không xoá được sản phẩm.",
      });
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const imagePreviewSrc = preview ?? resolveImageUrl(form.currentImageUrl);
  const hasImage = Boolean(preview || form.currentImageUrl);

  const noticeBox = notice ? (
    <Notice tone={notice.tone}>
      {notice.text}
      {pendingUpload ? (
        <Button variant="outline" size="sm" className="mt-2 flex" onClick={retryUpload} disabled={saving}>
          Thử tải ảnh lại
        </Button>
      ) : null}
    </Notice>
  ) : null;

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Quản lý hoa"
        description="Thêm, sửa, xoá sản phẩm, cập nhật tồn kho và ảnh cho cửa hàng."
        actions={
          <Button variant="primary" size="md" onClick={startCreate}>
            <Plus aria-hidden="true" />
            Thêm sản phẩm
          </Button>
        }
      />

      {/* Khi ngan keo dang mo, thong bao hien trong ngan keo thay vi o day */}
      {noticeBox && !formOpen ? <div className="mt-6">{noticeBox}</div> : null}

      {/* ---------- Thong ke nhanh: bam de loc ---------- */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Sản phẩm đang bán"
          value={allProducts?.length ?? data?.totalElements ?? null}
          active={stockFilter === null && categoryFilter === null && !debouncedSearch}
          onClick={() => {
            setStockFilter(null);
            setCategoryFilter(null);
            setSearch("");
          }}
        />
        <StatTile
          label="Sắp hết hàng"
          hint={`Dưới ${LOW_STOCK} bó`}
          value={allProducts ? lowStock.length : null}
          tone="warning"
          icon={AlertTriangle}
          active={stockFilter === "LOW"}
          onClick={() => setStockFilter(stockFilter === "LOW" ? null : "LOW")}
        />
        <StatTile
          label="Hết hàng"
          hint="Khách không đặt được"
          value={allProducts ? outOfStock.length : null}
          tone="danger"
          icon={PackageX}
          active={stockFilter === "OUT"}
          onClick={() => setStockFilter(stockFilter === "OUT" ? null : "OUT")}
        />
        <StatTile
          label="Cần đặt trước"
          hint="Không giao trong ngày"
          value={allProducts ? allProducts.filter((p) => (p.leadDays ?? 0) > 0).length : null}
          icon={CalendarClock}
        />
      </div>

      <section aria-labelledby="admin-list-heading" className="card mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 id="admin-list-heading" className="sr-only">
              Danh sách sản phẩm
            </h2>
            {/* Loc theo danh muc (server loc) */}
            <div role="group" aria-label="Lọc theo danh mục" className="flex flex-wrap gap-1.5">
              <FilterChip active={categoryFilter === null} onClick={() => setCategoryFilter(null)}>
                Tất cả
              </FilterChip>
              {categories.map((c) => (
                <FilterChip key={c.id} active={categoryFilter === c.id} onClick={() => setCategoryFilter(c.id)}>
                  {c.name}
                  <span className="num text-[11px] text-subtle-foreground">{c.productCount}</span>
                </FilterChip>
              ))}
            </div>
            {stockFilter ? (
              <button
                type="button"
                onClick={() => setStockFilter(null)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
                  stockFilter === "LOW" ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger",
                )}
              >
                {stockFilter === "LOW" ? "Sắp hết hàng" : "Hết hàng"} ✕
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Label htmlFor="admin-search" className="sr-only">
                Tìm theo tên
              </Label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              />
              <Input
                id="admin-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên hoa…"
                className="pl-9"
              />
            </div>
            <div role="group" aria-label="Kiểu xem" className="inline-flex shrink-0 rounded-[var(--radius-sm)] bg-background p-1">
              {(
                [
                  ["grid", LayoutGrid, "Xem dạng lưới"],
                  ["table", List, "Xem dạng bảng"],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={view === key}
                  title={label}
                  onClick={() => setView(key)}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-[5px] transition-colors",
                    view === key
                      ? "bg-surface-raised text-foreground shadow-[var(--shadow-card)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="num border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
          {shownTotal != null ? `${shownTotal} sản phẩm` : "Đang tải…"}
          {loading && data ? <Loader2 className="ml-2 inline size-3.5 animate-spin" aria-hidden="true" /> : null}
        </p>

        {view === "grid" ? (
          <div className="border-t border-border p-4 sm:p-5">
            {loading && !data && !stockList ? (
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <li key={index} className="aspect-[4/5] animate-pulse rounded-[var(--radius-md)] bg-surface-raised" />
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {shown?.map((product) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    occasionLabel={occasionLabel}
                    onEdit={() => startEdit(product)}
                    onDelete={() => setConfirmTarget(product)}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[54rem]">
              <caption className="sr-only">
                Danh sách sản phẩm hoa với ảnh, tên, danh mục, giá, tồn kho và thao tác
              </caption>
              <thead>
                <tr>
                  <th scope="col">Sản phẩm</th>
                  <th scope="col">Danh mục</th>
                  <th scope="col" className="text-right">
                    Giá
                  </th>
                  <th scope="col" className="text-right">
                    Tồn kho
                  </th>
                  <th scope="col" className="text-right">
                    Đánh giá
                  </th>
                  <th scope="col" className="text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && !stockList
                  ? Array.from({ length: 6 }).map((_, index) => <TableRowSkeleton key={index} columns={6} />)
                  : shown?.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveImageUrl(product.imageUrl)}
                              alt=""
                              onError={(event) => {
                                const img = event.currentTarget;
                                if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                              }}
                              className="size-10 shrink-0 rounded-[var(--radius-sm)] bg-surface-raised object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{product.name}</p>
                              <p className="num text-xs text-subtle-foreground">
                                #{product.id}
                                {product.sized ? " · 3 cỡ" : ""}
                                {product.leadDays > 0 ? ` · đặt trước ${product.leadDays} ngày` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {product.category ? (
                            <span className="inline-flex rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-muted-foreground ring-1 ring-inset ring-border">
                              {product.category.name}
                            </span>
                          ) : (
                            <span className="text-subtle-foreground">—</span>
                          )}
                        </td>
                        <td className="num text-right text-foreground">{formatPrice(product.price)}</td>
                        <td className="text-right">
                          <StockCell quantity={product.stockQuantity ?? 0} />
                        </td>
                        <td className="num text-right">
                          {product.ratingCount > 0 && product.ratingAverage != null ? (
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
                              {product.ratingAverage.toFixed(1)}
                              <span className="text-xs text-subtle-foreground">({product.ratingCount})</span>
                            </span>
                          ) : (
                            <span className="text-subtle-foreground">—</span>
                          )}
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(product)}>
                              <Pencil aria-hidden="true" />
                              <span className="sr-only">Sửa {product.name}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-danger/10 hover:text-danger"
                              onClick={() => setConfirmTarget(product)}
                            >
                              <Trash2 aria-hidden="true" />
                              <span className="sr-only">Xoá {product.name}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {error && !stockList ? (
          <div className="border-t border-border p-5">
            <ErrorState
              message={error}
              action={
                <Button variant="outline" size="md" onClick={reload}>
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : null}

        {shown && shown.length === 0 && !loading ? (
          <div className="border-t border-border">
            <EmptyState
              title={
                stockFilter
                  ? stockFilter === "LOW"
                    ? "Không có sản phẩm nào sắp hết"
                    : "Không có sản phẩm nào hết hàng"
                  : search || categoryFilter
                    ? "Không tìm thấy sản phẩm"
                    : "Chưa có sản phẩm nào"
              }
              description={
                stockFilter
                  ? "Tồn kho đang ổn."
                  : search || categoryFilter
                    ? "Thử từ khoá khác hoặc chọn danh mục Tất cả."
                    : "Bấm Thêm sản phẩm để tạo sản phẩm hoa đầu tiên."
              }
            />
          </div>
        ) : null}

        {!stockList && data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <span className="num text-xs text-muted-foreground">
              Trang {data.number + 1} / {data.totalPages}
            </span>
            <Pagination
              page={data.number}
              totalPages={data.totalPages}
              onChange={setPage}
              label="Phân trang sản phẩm"
            />
          </div>
        ) : null}
      </section>

      {/* ---------- Bieu mau them / sua trong ngan keo ben phai ---------- */}
      <Sheet
        open={formOpen}
        onOpenChange={(open) => {
          if (!saving) setFormOpen(open);
        }}
        title={form.id ? `Sửa sản phẩm #${form.id}` : "Thêm sản phẩm"}
        description={
          form.id ? "Cập nhật thông tin, tồn kho hoặc ảnh." : "Điền thông tin sản phẩm hoa mới."
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Huỷ
            </Button>
            <Button type="submit" form="product-form" variant="primary" size="md" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Đang lưu…
                </>
              ) : form.id ? (
                <>
                  <Upload aria-hidden="true" />
                  Lưu thay đổi
                </>
              ) : (
                <>
                  <Plus aria-hidden="true" />
                  Thêm sản phẩm
                </>
              )}
            </Button>
          </>
        }
      >
        {noticeBox ? <div className="mb-5">{noticeBox}</div> : null}

        <form id="product-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          <Field id="name" label="Tên sản phẩm" error={fieldErrors.name} required>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                maxLength={100}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Noir Dahlia Hand-Tied"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="price" label="Giá (VND)" error={fieldErrors.price} required>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="decimal"
                  className="num"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="68"
                />
              )}
            </Field>

            <Field id="stockQuantity" label="Tồn kho" error={fieldErrors.stockQuantity} required>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className="num"
                  value={form.stockQuantity}
                  onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })}
                  placeholder="50"
                />
              )}
            </Field>
          </div>

          <Field
            id="categoryId"
            label="Danh mục"
            error={fieldErrors.categoryId ?? categoriesError ?? undefined}
            required
          >
            {(props) => (
              <NativeSelect
                {...props}
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              >
                <option value="">— Chọn danh mục —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>

          {attributes.occasions.length > 0 ? (
            <fieldset>
              <legend className="mb-1.5 text-[0.8125rem] font-medium text-muted-foreground">
                Dịp phù hợp
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {attributes.occasions.map((option) => {
                  const checked = form.occasions.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
                        checked
                          ? "border-accent bg-accent-soft text-foreground"
                          : "border-border text-muted-foreground hover:border-border-strong"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() =>
                          setForm({
                            ...form,
                            occasions: checked
                              ? form.occasions.filter((value) => value !== option.value)
                              : [...form.occasions, option.value],
                          })
                        }
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-subtle-foreground">
                Khách lọc theo dịp ở trang cửa hàng. Chọn được nhiều dịp.
              </p>
            </fieldset>
          ) : null}

          {/* ---------- Thong tin bo hoa: khach dat hoa can biet nhan duoc gi, bao gio ---------- */}
          <Field
            id="composition"
            label="Thành phần bó"
            error={fieldErrors.composition}
            hint="Loại hoa, lá phụ, giấy gói — hiện ở trang chi tiết."
          >
            {(props) => (
              <Textarea
                {...props}
                rows={2}
                maxLength={500}
                value={form.composition}
                onChange={(event) => setForm({ ...form, composition: event.target.value })}
                placeholder="12 hồng đỏ Ecuador, baby trắng, lá bạc; gói giấy kraft"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              id="stemCount"
              label="Số bông (cỡ tiêu chuẩn)"
              error={fieldErrors.stemCount}
              hint="Để trống nếu là trọn gói / trang trí."
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  className="num"
                  value={form.stemCount}
                  onChange={(event) => setForm({ ...form, stemCount: event.target.value })}
                  placeholder="20"
                />
              )}
            </Field>
            <Field
              id="leadDays"
              label="Đặt trước (ngày)"
              error={fieldErrors.leadDays}
              hint="0 = giao được trong ngày."
              required
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  inputMode="numeric"
                  className="num"
                  value={form.leadDays}
                  onChange={(event) => setForm({ ...form, leadDays: event.target.value })}
                />
              )}
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.sized}
              onChange={(event) => setForm({ ...form, sized: event.target.checked })}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="text-foreground">Bán theo 3 cỡ Nhỏ / Tiêu chuẩn / Lớn</span>
              <span className="mt-0.5 block text-xs text-subtle-foreground">
                Giá trên là cỡ tiêu chuẩn. Cỡ nhỏ ×0,75 giá · 70% số bông; cỡ lớn ×1,4 giá · 150% số bông
                (làm tròn 10.000₫).
              </span>
            </span>
          </label>

          {attributes.colors.length > 0 ? (
            <Field id="color" label="Màu chủ đạo">
              {(props) => (
                <NativeSelect
                  {...props}
                  value={form.color}
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                >
                  <option value="">— Chưa phân loại —</option>
                  {attributes.colors.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          ) : null}

          <Field id="description" label="Mô tả" error={fieldErrors.description}>
            {(props) => (
              <Textarea
                {...props}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Hoa gì, buộc kiểu nào, hợp dịp nào…"
              />
            )}
          </Field>

          <Field
            id="image"
            label="Ảnh sản phẩm"
            error={fieldErrors.image}
            hint={
              form.id
                ? "Không chọn ảnh mới thì ảnh cũ được giữ nguyên. Tối đa 5MB."
                : "jpg, png, webp, gif, avif. Tối đa 5MB."
            }
          >
            {({ invalid, ...props }) => (
              // `invalid` la co noi bo cua <Field>, khong phai thuoc tinh DOM hop le
              // -> tach ra va chuyen thanh aria-invalid.
              <input
                {...props}
                aria-invalid={invalid || undefined}
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-[var(--radius-sm)] border border-dashed border-border-strong bg-background px-3 py-2.5 text-sm text-muted-foreground file:mr-3 file:rounded-[5px] file:border-0 file:bg-surface-raised file:px-3 file:py-1.5 file:font-sans file:text-[0.8125rem] file:font-medium file:text-foreground hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            )}
          </Field>

          {hasImage ? (
            <figure className="flex items-center gap-4 rounded-[var(--radius-sm)] border border-border bg-background p-3">
              <img
                src={imagePreviewSrc}
                alt=""
                onError={(event) => {
                  const img = event.currentTarget;
                  if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                }}
                className="size-16 shrink-0 rounded-[var(--radius-sm)] object-cover"
              />
              <figcaption className="text-xs text-muted-foreground">
                {preview ? "Ảnh mới sẽ được tải lên sau khi lưu." : "Ảnh hiện tại của sản phẩm."}
              </figcaption>
            </figure>
          ) : null}
        </form>
      </Sheet>

      {/* Hop xac nhan xoa — Radix lo focus trap va Esc */}
      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent
          open={confirmTarget !== null}
          title="Xoá sản phẩm?"
          description={
            confirmTarget
              ? `"${confirmTarget.name}" (#${confirmTarget.id}) sẽ bị xoá khỏi cơ sở dữ liệu. Thao tác này không hoàn tác được.`
              : undefined
          }
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setConfirmTarget(null)} disabled={deleting}>
                Huỷ
              </Button>
              <Button variant="danger" size="md" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Đang xoá…
                  </>
                ) : (
                  <>
                    <Trash2 aria-hidden="true" />
                    Xoá
                  </>
                )}
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  );
}

/** O ton kho: so luong + nhan canh bao khi het hoac sap het (chu di kem mau). */
function StockCell({ quantity }: { quantity: number }) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex rounded-full bg-danger/12 px-2.5 py-0.5 text-xs font-medium text-danger">
        Hết hàng
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-end gap-2">
      {quantity < LOW_STOCK ? (
        <span className="rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning">
          Sắp hết
        </span>
      ) : null}
      <span className="num text-foreground">{quantity}</span>
    </span>
  );
}

/** O thong ke dau trang; co onClick thi bam de loc danh sach. */
function StatTile({
  label,
  hint,
  value,
  tone,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string;
  hint?: string;
  value: number | null;
  tone?: "warning" | "danger";
  icon?: typeof Star;
  active?: boolean;
  onClick?: () => void;
}) {
  const alert = tone && (value ?? 0) > 0;
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[0.8125rem] text-muted-foreground">{label}</span>
        {Icon ? (
          <Icon
            className={cn(
              "size-4 shrink-0",
              alert ? (tone === "danger" ? "text-danger" : "text-warning") : "text-subtle-foreground",
            )}
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span
        className={cn(
          "num mt-1.5 block text-2xl font-semibold leading-none",
          alert ? (tone === "danger" ? "text-danger" : "text-warning") : "text-foreground",
        )}
      >
        {value ?? "—"}
      </span>
      {hint ? <span className="mt-1.5 block text-xs text-subtle-foreground">{hint}</span> : null}
    </>
  );
  const className = cn(
    "card block w-full p-4 text-left transition-colors",
    active && "border-accent/60 bg-accent-soft/40",
  );
  return onClick ? (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        className,
        "hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-accent/60 bg-accent-soft text-foreground"
          : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The san pham dang luoi: anh lon nhu catalogue, nhan ton kho tren anh, thong tin chinh
 * ben duoi; nut Sua / Xoa luon hien (khong giau sau hover - man hinh cam ung khong hover).
 */
function ProductTile({
  product,
  occasionLabel,
  onEdit,
  onDelete,
}: {
  product: Product;
  occasionLabel: (code: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stock = product.stockQuantity ?? 0;
  const prices = product.sizes?.map((s) => s.price) ?? [];
  const minPrice = prices.length ? Math.min(...prices) : product.price;
  const maxPrice = prices.length ? Math.max(...prices) : product.price;
  return (
    <li className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface transition-colors hover:border-border-strong">
      <button
        type="button"
        onClick={onEdit}
        className="relative block aspect-[4/5] overflow-hidden bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <img
          src={resolveImageUrl(product.imageUrl)}
          alt=""
          onError={(event) => {
            const img = event.currentTarget;
            if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
          }}
          className={cn(
            "size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
            stock <= 0 && "opacity-50 grayscale",
          )}
        />
        <span className="absolute left-2 top-2 flex flex-wrap gap-1">
          {stock <= 0 ? (
            <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-medium text-background">Hết hàng</span>
          ) : stock < LOW_STOCK ? (
            <span className="rounded-full bg-warning px-2 py-0.5 text-[11px] font-medium text-background">
              Còn {stock}
            </span>
          ) : null}
          {product.leadDays > 0 ? (
            <span className="rounded-full bg-background/85 px-2 py-0.5 text-[11px] text-foreground backdrop-blur-sm">
              Đặt trước {product.leadDays} ngày
            </span>
          ) : null}
        </span>
        <span className="sr-only">Sửa {product.name}</span>
      </button>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-xs text-subtle-foreground">
          {product.category?.name ?? "Chưa có danh mục"}
          <span className="num"> · #{product.id}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-foreground">{product.name}</p>
        <p className="num mt-1.5 text-sm text-accent">
          {minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {product.sized ? (
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-muted-foreground">3 cỡ</span>
          ) : null}
          {product.occasions.slice(0, 2).map((o) => (
            <span key={o} className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-muted-foreground">
              {occasionLabel(o)}
            </span>
          ))}
          {product.occasions.length > 2 ? (
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[11px] text-muted-foreground">
              +{product.occasions.length - 2}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <span className="num flex items-center gap-2 text-xs text-muted-foreground">
            <span>Kho {stock}</span>
            {product.ratingCount > 0 && product.ratingAverage != null ? (
              <span className="inline-flex items-center gap-0.5 text-foreground">
                <Star className="size-3 fill-accent text-accent" aria-hidden="true" />
                {product.ratingAverage.toFixed(1)}
              </span>
            ) : null}
          </span>
          <span className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="size-8" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              <span className="sr-only">Sửa {product.name}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:bg-danger/10 hover:text-danger"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" />
              <span className="sr-only">Xoá {product.name}</span>
            </Button>
          </span>
        </div>
      </div>
    </li>
  );
}
