import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/AdminShell";
import { Field, Input } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Notice, TableRowSkeleton } from "@/components/ui/feedback";
import { ApiError, api, type Category } from "@/lib/api";

/**
 * Trang quan tri danh muc — phan tich hop them so voi giao dien mau cua SOS09,
 * de CRUD Category cua SOS05/SOS06 duoc dung that trong ung dung.
 *
 * Chinh sach xoa: backend KHONG cascade. Danh muc con san pham se tra 409
 * kem thong bao ro rang; giao dien hien dung thong bao do.
 */
export default function AdminCategoriesPage() {

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setCategories(await api.listCategories());
    } catch (error) {
      setCategories(null);
      setLoadError(error instanceof Error ? error.message : "Không tải được danh mục.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setNameError(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Nhập tên danh mục.");
      return;
    }
    if (trimmed.length > 100) {
      setNameError("Tên danh mục tối đa 100 ký tự.");
      return;
    }
    setNameError(undefined);

    setSaving(true);
    try {
      if (editingId) {
        await api.updateCategory(editingId, trimmed);
        setNotice({ tone: "success", text: `Đã cập nhật danh mục "${trimmed}".` });
      } else {
        await api.createCategory(trimmed);
        setNotice({ tone: "success", text: `Đã thêm danh mục "${trimmed}".` });
      }
      resetForm();
      await load();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.name) setNameError(error.fieldErrors.name);
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Không lưu được danh mục.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await api.deleteCategory(confirmTarget.id);
      setNotice({ tone: "success", text: `Đã xoá danh mục "${confirmTarget.name}".` });
      if (editingId === confirmTarget.id) resetForm();
      setConfirmTarget(null);
      await load();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Không xoá được danh mục.",
      });
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Danh mục"
        description="Nhóm sản phẩm theo loại. Không xoá được danh mục còn sản phẩm — hãy chuyển hoặc xoá sản phẩm bên trong trước."
      />

      {notice ? (
        <Notice tone={notice.tone} className="mt-6">
          {notice.text}
        </Notice>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="category-list-heading" className="card min-w-0 overflow-hidden">
          <div className="flex items-baseline gap-2 px-5 py-4">
            <h2 id="category-list-heading" className="text-base text-foreground">
              Tất cả danh mục
            </h2>
            {categories ? (
              <span className="num text-xs text-muted-foreground">{categories.length} danh mục</span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="data-table min-w-[32rem]">
              <caption className="sr-only">Danh sách danh mục và số sản phẩm trong mỗi danh mục</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-20">
                    Mã
                  </th>
                  <th scope="col">Tên danh mục</th>
                  <th scope="col" className="text-right">
                    Sản phẩm
                  </th>
                  <th scope="col" className="text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <TableRowSkeleton key={index} columns={4} />
                    ))
                  : categories?.map((category) => (
                      <tr
                        key={category.id}
                        className={editingId === category.id ? "bg-accent-soft/60" : undefined}
                      >
                        <td className="num text-subtle-foreground">#{category.id}</td>
                        <td className="font-medium text-foreground">{category.name}</td>
                        <td className="text-right">
                          <span className="num inline-flex min-w-8 justify-center rounded-full bg-surface-raised px-2 py-0.5 text-xs text-muted-foreground">
                            {category.productCount}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingId(category.id);
                                setName(category.name);
                                setNameError(undefined);
                                setNotice(null);
                              }}
                            >
                              <Pencil aria-hidden="true" />
                              <span className="sr-only">Sửa {category.name}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-danger/10 hover:text-danger"
                              onClick={() => setConfirmTarget(category)}
                            >
                              <Trash2 aria-hidden="true" />
                              <span className="sr-only">Xoá {category.name}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {loadError ? (
            <div className="border-t border-border p-5">
              <ErrorState
                message={loadError}
                action={
                  <Button variant="outline" size="md" onClick={() => void load()}>
                    Thử lại
                  </Button>
                }
              />
            </div>
          ) : null}

          {!loading && categories?.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState
                title="Chưa có danh mục nào"
                description="Tạo danh mục đầu tiên ở biểu mẫu bên cạnh, ví dụ Bespoke Arrangements."
              />
            </div>
          ) : null}
        </section>

        <section aria-labelledby="category-form-heading" className="lg:sticky lg:top-20 lg:self-start">
          <form onSubmit={handleSubmit} noValidate className="card p-5">
            <h2 id="category-form-heading" className="text-base text-foreground">
              {editingId ? `Sửa danh mục #${editingId}` : "Thêm danh mục"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {editingId ? "Đổi tên rồi bấm Lưu thay đổi." : "Tên hiển thị trên cửa hàng."}
            </p>

            <div className="mt-5">
              <Field id="category-name" label="Tên danh mục" error={nameError} required>
                {(props) => (
                  <Input
                    {...props}
                    value={name}
                    maxLength={100}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Bespoke Arrangements"
                  />
                )}
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {editingId ? (
                <Button type="button" variant="outline" size="md" onClick={resetForm} disabled={saving}>
                  <RotateCcw aria-hidden="true" />
                  Huỷ sửa
                </Button>
              ) : null}
              <Button type="submit" variant="primary" size="md" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Đang lưu…
                  </>
                ) : editingId ? (
                  "Lưu thay đổi"
                ) : (
                  <>
                    <Plus aria-hidden="true" />
                    Thêm
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent
          open={confirmTarget !== null}
          title="Xoá danh mục?"
          description={
            confirmTarget
              ? confirmTarget.productCount > 0
                ? `"${confirmTarget.name}" đang có ${confirmTarget.productCount} sản phẩm. Backend sẽ từ chối (409) cho tới khi bạn chuyển hoặc xoá hết sản phẩm bên trong.`
                : `"${confirmTarget.name}" (#${confirmTarget.id}) sẽ bị xoá khỏi cơ sở dữ liệu.`
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
