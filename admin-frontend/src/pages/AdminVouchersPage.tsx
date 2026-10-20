import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Eye, Gift, Hand, Loader2, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, ErrorState, Notice, TableRowSkeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/site/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api, type ManagedUser, type Voucher, type VoucherPayload } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormState = {
  id: number | null;
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  onePerCustomer: boolean;
  active: boolean;
  /** "" = ma chung cho moi khach; con lai la id khach duoc tang ma. */
  ownerUserId: string;
  ownerUsername: string;
  /** Ma san: khach bam Luu o trang Voucher moi dung duoc. */
  claimRequired: boolean;
  claimLimit: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  code: "",
  description: "",
  type: "PERCENT",
  value: "",
  maxDiscount: "",
  minOrderValue: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  onePerCustomer: false,
  active: true,
  ownerUserId: "",
  ownerUsername: "",
  claimRequired: false,
  claimLimit: "",
};

/** Trang thai hien thi cua mot ma — tinh tu du lieu, backend khong luu san. */
function statusOf(v: Voucher): { label: string; className: string } {
  // "Hom nay" theo gio Viet Nam (UTC+7), trung voi cach backend xet han ma
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  if (!v.active) return { label: "Đã tắt", className: "bg-surface-raised text-muted-foreground ring-border" };
  if (v.endDate && v.endDate < today)
    return { label: "Hết hạn", className: "bg-danger/12 text-danger ring-danger/25" };
  if (v.usageLimit != null && v.usedCount >= v.usageLimit)
    return { label: "Hết lượt", className: "bg-warning/12 text-warning ring-warning/25" };
  if (v.startDate && v.startDate > today)
    return { label: "Chưa bắt đầu", className: "bg-info/12 text-info ring-info/25" };
  return { label: "Đang chạy", className: "bg-success/12 text-success ring-success/25" };
}

function describeDiscount(v: Voucher): string {
  if (v.type === "PERCENT") {
    return `${v.value}%` + (v.maxDiscount ? ` · tối đa ${formatPrice(v.maxDiscount)}` : "");
  }
  return formatPrice(v.value);
}

function formatDay(value: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function toPayload(form: FormState): VoucherPayload {
  const num = (value: string) => (value.trim() === "" ? null : Number(value));
  return {
    code: form.code.trim().toUpperCase(),
    description: form.description.trim() || null,
    type: form.type,
    value: Number(form.value),
    maxDiscount: form.type === "PERCENT" ? num(form.maxDiscount) : null,
    minOrderValue: num(form.minOrderValue),
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    usageLimit: num(form.usageLimit),
    onePerCustomer: form.onePerCustomer,
    active: form.active,
    ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : null,
    ownerUsername: form.ownerUserId ? form.ownerUsername : null,
    // Ma rieng khong san duoc - backend cung tu choi
    claimRequired: form.claimRequired && !form.ownerUserId,
    claimLimit: form.claimRequired && !form.ownerUserId ? num(form.claimLimit) : null,
  };
}

function fromVoucher(v: Voucher): FormState {
  return {
    id: v.id,
    code: v.code,
    description: v.description ?? "",
    type: v.type,
    value: String(v.value),
    maxDiscount: v.maxDiscount != null ? String(v.maxDiscount) : "",
    minOrderValue: v.minOrderValue ? String(v.minOrderValue) : "",
    startDate: v.startDate ?? "",
    endDate: v.endDate ?? "",
    usageLimit: v.usageLimit != null ? String(v.usageLimit) : "",
    onePerCustomer: v.onePerCustomer,
    active: v.active,
    ownerUserId: v.ownerUserId != null ? String(v.ownerUserId) : "",
    ownerUsername: v.ownerUsername ?? "",
    claimRequired: v.claimRequired,
    claimLimit: v.claimLimit != null ? String(v.claimLimit) : "",
  };
}

/**
 * Quan ly ma giam gia. Ma nam o order-service vi gan voi viec tinh tien don.
 * Ma da co nguoi dung thi khong xoa duoc (backend tra 409) — chi tat de giu lich su don.
 */
export default function AdminVouchersPage() {
  // Nhan vien chi XEM ma: tao / sua / bat tat / xoa la viec cua ADMIN (backend cung chan 403)
  const { isAdmin } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Voucher | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Khach de tang ma rieng (chi ADMIN goi duoc GET /users)
  const [customers, setCustomers] = useState<ManagedUser[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    api
      .listUsers(controller.signal)
      .then((users) => setCustomers(users.filter((u) => u.role === "CUSTOMER")))
      .catch(() => setCustomers([]));
    return () => controller.abort();
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setVouchers(await api.listVouchers());
    } catch (error) {
      setVouchers(null);
      setLoadError(error instanceof Error ? error.message : "Không tải được mã giảm giá.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(v: Voucher) {
    setForm(fromVoucher(v));
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    const code = form.code.trim();
    if (!code) next.code = "Nhập mã.";
    else if (!/^[A-Za-z0-9_-]{3,30}$/.test(code))
      next.code = "3–30 ký tự, chỉ chữ không dấu, số, gạch ngang, gạch dưới.";

    const value = Number(form.value);
    if (form.value.trim() === "" || !Number.isFinite(value) || value <= 0)
      next.value = "Mức giảm phải lớn hơn 0.";
    else if (form.type === "PERCENT" && value > 100) next.value = "Tối đa 100%.";

    if (form.startDate && form.endDate && form.endDate < form.startDate)
      next.endDate = "Ngày hết hạn phải sau ngày bắt đầu.";

    if (form.usageLimit.trim() !== "" && (!Number.isInteger(Number(form.usageLimit)) || Number(form.usageLimit) < 1))
      next.usageLimit = "Số nguyên từ 1 trở lên, hoặc để trống.";

    if (
      form.claimRequired &&
      form.claimLimit.trim() !== "" &&
      (!Number.isInteger(Number(form.claimLimit)) || Number(form.claimLimit) < 1)
    )
      next.claimLimit = "Số nguyên từ 1 trở lên, hoặc để trống.";

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = toPayload(form);
      const saved = form.id
        ? await api.updateVoucher(form.id, payload)
        : await api.createVoucher(payload);
      setNotice({
        tone: "success",
        text: form.id ? `Đã cập nhật mã ${saved.code}.` : `Đã tạo mã ${saved.code}.`,
      });
      setFormOpen(false);
      await load();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setFieldErrors(error.fieldErrors);
      setFormError(error instanceof Error ? error.message : "Không lưu được mã.");
    } finally {
      setSaving(false);
    }
  }

  /** Bat / tat nhanh ngay tren bang: gui lai toan bo ma voi active dao nguoc. */
  async function toggleActive(v: Voucher) {
    setTogglingId(v.id);
    setNotice(null);
    try {
      await api.updateVoucher(v.id, { ...toPayload(fromVoucher(v)), active: !v.active });
      setNotice({ tone: "success", text: v.active ? `Đã tắt mã ${v.code}.` : `Đã bật lại mã ${v.code}.` });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không đổi được trạng thái." });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await api.deleteVoucher(confirmTarget.id);
      setNotice({ tone: "success", text: `Đã xoá mã ${confirmTarget.code}.` });
      setConfirmTarget(null);
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không xoá được mã." });
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const running = vouchers?.filter((v) => statusOf(v).label === "Đang chạy").length ?? 0;
  const totalUses = vouchers?.reduce((sum, v) => sum + v.usedCount, 0) ?? 0;
  const personalCount = vouchers?.filter((v) => v.ownerUserId != null).length ?? 0;

  /** Chon khach duoc tang: ma rieng mac dinh moi khach dung mot lan. */
  function chooseOwner(id: string) {
    if (!id) {
      setForm({ ...form, ownerUserId: "", ownerUsername: "" });
      return;
    }
    const customer = customers.find((c) => String(c.id) === id);
    setForm({
      ...form,
      ownerUserId: id,
      ownerUsername: customer?.username ?? form.ownerUsername,
      onePerCustomer: form.ownerUserId ? form.onePerCustomer : true,
      // Ma tang rieng da nam san trong vi khach, khong can san
      claimRequired: false,
    });
  }

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Mã giảm giá"
        description={
          isAdmin
            ? "Tạo mã khuyến mãi cho khách nhập ở bước thanh toán. Mã đã có người dùng chỉ tắt được, không xoá."
            : "Các mã khuyến mãi đang có để tư vấn cho khách. Chỉ quản trị viên được tạo, sửa hay tắt mã."
        }
        actions={
          isAdmin ? (
            <Button variant="primary" size="md" onClick={openCreate}>
              <Plus aria-hidden="true" />
              Tạo mã
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1.5 text-xs text-muted-foreground">
              <Eye className="size-3.5" aria-hidden="true" />
              Chỉ xem
            </span>
          )
        }
      />

      {notice && !formOpen ? (
        <Notice tone={notice.tone} className="mt-6">
          {notice.text}
        </Notice>
      ) : null}

      {vouchers && vouchers.length > 0 ? (
        <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Tổng số mã", value: vouchers.length },
            { label: "Đang chạy", value: running },
            { label: "Mã tặng riêng", value: personalCount },
            { label: "Lượt đã dùng", value: totalUses },
          ].map((item) => (
            <div key={item.label} className="card p-4">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="num mt-1 text-xl font-semibold text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <section aria-labelledby="voucher-list-heading" className="card mt-4 overflow-hidden">
        <div className="px-5 py-4">
          <h2 id="voucher-list-heading" className="text-base text-foreground">
            Tất cả mã
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[60rem]">
            <caption className="sr-only">Danh sách mã giảm giá, mức giảm, điều kiện, lượt dùng và trạng thái</caption>
            <thead>
              <tr>
                <th scope="col">Mã</th>
                <th scope="col">Mức giảm</th>
                <th scope="col">Điều kiện</th>
                <th scope="col">Hiệu lực</th>
                <th scope="col">Đã dùng</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" className="text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && !vouchers
                ? Array.from({ length: 3 }).map((_, index) => <TableRowSkeleton key={index} columns={7} />)
                : vouchers?.map((v) => {
                    const status = statusOf(v);
                    const ratio = v.usageLimit ? Math.min(1, v.usedCount / v.usageLimit) : 0;
                    return (
                      <tr key={v.id}>
                        <td>
                          <code className="rounded bg-accent-soft px-1.5 py-0.5 font-semibold tracking-wide text-accent">
                            {v.code}
                          </code>
                          {v.ownerUsername ? (
                            <span className="mt-1 flex items-center gap-1 text-xs text-accent">
                              <Gift className="size-3" aria-hidden="true" />
                              Riêng cho {v.ownerUsername}
                            </span>
                          ) : null}
                          {v.claimRequired ? (
                            <span className="num mt-1 flex items-center gap-1 text-xs text-info">
                              <Hand className="size-3" aria-hidden="true" />
                              Mã săn · đã lưu {v.claimedCount}
                              {v.claimLimit != null ? ` / ${v.claimLimit}` : ""}
                            </span>
                          ) : null}
                          {v.description ? (
                            <span className="mt-1 block max-w-56 truncate text-xs text-subtle-foreground">
                              {v.description}
                            </span>
                          ) : null}
                        </td>
                        <td className="num text-foreground">{describeDiscount(v)}</td>
                        <td className="text-xs text-muted-foreground">
                          {v.minOrderValue > 0 ? `Đơn từ ${formatPrice(v.minOrderValue)}` : "Mọi đơn"}
                          {v.onePerCustomer ? <span className="block">Mỗi khách 1 lần</span> : null}
                        </td>
                        <td className="num text-xs text-muted-foreground">
                          {v.startDate || v.endDate ? (
                            <>
                              {v.startDate ? formatDay(v.startDate) : "Ngay"} → {v.endDate ? formatDay(v.endDate) : "không hạn"}
                            </>
                          ) : (
                            "Không giới hạn"
                          )}
                        </td>
                        <td className="w-36">
                          <span className="num text-foreground">
                            {v.usedCount}
                            <span className="text-subtle-foreground"> / {v.usageLimit ?? "∞"}</span>
                          </span>
                          {v.usageLimit ? (
                            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-raised">
                              <span
                                className="block h-full rounded-full bg-accent"
                                style={{ width: `${ratio * 100}%` }}
                              />
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <span
                            className={cn(
                              "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td>
                          {isAdmin ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void toggleActive(v)}
                              disabled={togglingId === v.id}
                            >
                              {togglingId === v.id ? (
                                <Loader2 className="animate-spin" aria-hidden="true" />
                              ) : v.active ? (
                                <Pause aria-hidden="true" />
                              ) : (
                                <Play aria-hidden="true" />
                              )}
                              <span className="sr-only">{v.active ? `Tắt mã ${v.code}` : `Bật mã ${v.code}`}</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                              <Pencil aria-hidden="true" />
                              <span className="sr-only">Sửa mã {v.code}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-danger/10 hover:text-danger"
                              onClick={() => setConfirmTarget(v)}
                            >
                              <Trash2 aria-hidden="true" />
                              <span className="sr-only">Xoá mã {v.code}</span>
                            </Button>
                          </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
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

        {!loading && vouchers?.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState
              title="Chưa có mã giảm giá nào"
              description={
                isAdmin
                  ? "Tạo mã đầu tiên, ví dụ BLOOM10 giảm 10% cho đơn từ 500.000₫."
                  : "Quản trị viên chưa tạo mã khuyến mãi nào."
              }
              action={
                isAdmin ? (
                  <Button variant="primary" size="md" onClick={openCreate}>
                    <Plus aria-hidden="true" />
                    Tạo mã
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : null}
      </section>

      <Sheet
        open={formOpen}
        onOpenChange={(open) => {
          if (!saving) setFormOpen(open);
        }}
        title={form.id ? `Sửa mã ${form.code}` : "Tạo mã giảm giá"}
        description="Khách chọn hoặc nhập mã ở bước đặt hoa. Mã không phân biệt hoa thường."
        footer={
          <>
            <Button type="button" variant="outline" size="md" onClick={() => setFormOpen(false)} disabled={saving}>
              Huỷ
            </Button>
            <Button type="submit" form="voucher-form" variant="primary" size="md" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {form.id ? "Lưu thay đổi" : "Tạo mã"}
            </Button>
          </>
        }
      >
        {formError ? (
          <Notice tone="error" className="mb-5">
            {formError}
          </Notice>
        ) : null}

        <form id="voucher-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          <Field id="code" label="Mã" error={fieldErrors.code} required hint="Ví dụ BLOOM10, SINHNHAT-20">
            {(props) => (
              <Input
                {...props}
                value={form.code}
                maxLength={30}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                className="num uppercase tracking-wider"
                placeholder="BLOOM10"
              />
            )}
          </Field>

          <Field
            id="owner"
            label="Dành cho"
            error={fieldErrors.ownerUsername}
            hint={
              form.ownerUserId
                ? "Chỉ khách này thấy mã trong mục “Mã giảm giá của tôi” và dùng được mã."
                : "Mã chung: mọi khách nhập được, hiện trong danh sách mã khi đặt hoa."
            }
          >
            {(props) => (
              <NativeSelect {...props} value={form.ownerUserId} onChange={(event) => chooseOwner(event.target.value)}>
                <option value="">Mọi khách (mã chung)</option>
                {/* Chu cu khong con trong danh sach (hoac tai danh sach loi) van giu duoc khi sua */}
                {form.ownerUserId && !customers.some((c) => String(c.id) === form.ownerUserId) ? (
                  <option value={form.ownerUserId}>{form.ownerUsername}</option>
                ) : null}
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.fullName ? `${c.fullName} (${c.username})` : c.username}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>

          <Field id="description" label="Mô tả cho khách" error={fieldErrors.description}>
            {(props) => (
              <Input
                {...props}
                value={form.description}
                maxLength={200}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Giảm 10% mừng khai trương"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="type" label="Kiểu giảm" required>
              {(props) => (
                <NativeSelect
                  {...props}
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value as FormState["type"] })}
                >
                  <option value="PERCENT">Theo phần trăm</option>
                  <option value="FIXED">Số tiền cố định</option>
                </NativeSelect>
              )}
            </Field>
            <Field
              id="value"
              label={form.type === "PERCENT" ? "Mức giảm (%)" : "Mức giảm (VND)"}
              error={fieldErrors.value}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min="0"
                  step={form.type === "PERCENT" ? "1" : "1000"}
                  className="num"
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                  placeholder={form.type === "PERCENT" ? "10" : "5"}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {form.type === "PERCENT" ? (
              <Field id="maxDiscount" label="Giảm tối đa (VND)" error={fieldErrors.maxDiscount} hint="Trống = không giới hạn">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min="0"
                    step="1000"
                    className="num"
                    value={form.maxDiscount}
                    onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })}
                  />
                )}
              </Field>
            ) : (
              <div />
            )}
            <Field id="minOrderValue" label="Đơn tối thiểu (VND)" error={fieldErrors.minOrderValue} hint="Tính trên hoa + quà kèm">
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min="0"
                  step="1000"
                  className="num"
                  value={form.minOrderValue}
                  onChange={(event) => setForm({ ...form, minOrderValue: event.target.value })}
                  placeholder="0"
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field id="startDate" label="Bắt đầu" error={fieldErrors.startDate} hint="Trống = ngay bây giờ">
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  className="num"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              )}
            </Field>
            <Field id="endDate" label="Hết hạn" error={fieldErrors.endDate} hint="Trống = không hết hạn">
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  className="num"
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              )}
            </Field>
          </div>

          <Field id="usageLimit" label="Tổng số lượt dùng" error={fieldErrors.usageLimit} hint="Trống = không giới hạn">
            {(props) => (
              <Input
                {...props}
                type="number"
                min="1"
                step="1"
                className="num"
                value={form.usageLimit}
                onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
              />
            )}
          </Field>

          {/* Ma san: chi ma chung - ma tang rieng da nam san trong vi cua khach */}
          {!form.ownerUserId ? (
            <div className="space-y-4 rounded-[var(--radius-sm)] border border-border p-4">
              <label className="flex cursor-pointer items-start justify-between gap-3 text-sm text-foreground">
                <span>
                  Mã săn — khách phải bấm “Lưu”
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Mã hiện ở trang Voucher của cửa hàng; chưa lưu thì nhập mã cũng không dùng được.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.claimRequired}
                  onChange={(event) => setForm({ ...form, claimRequired: event.target.checked })}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
                />
              </label>
              {form.claimRequired ? (
                <Field
                  id="claimLimit"
                  label="Số lượt lưu tối đa"
                  error={fieldErrors.claimLimit}
                  hint="Hết lượt lưu thì mã hiện “Đã hết”. Trống = không giới hạn"
                >
                  {(props) => (
                    <Input
                      {...props}
                      type="number"
                      min="1"
                      step="1"
                      className="num"
                      value={form.claimLimit}
                      onChange={(event) => setForm({ ...form, claimLimit: event.target.value })}
                    />
                  )}
                </Field>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3 rounded-[var(--radius-sm)] border border-border p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-foreground">
              Mỗi tài khoản chỉ dùng một lần
              <input
                type="checkbox"
                checked={form.onePerCustomer}
                onChange={(event) => setForm({ ...form, onePerCustomer: event.target.checked })}
                className="size-4 accent-[var(--color-accent)]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-foreground">
              Đang bật
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                className="size-4 accent-[var(--color-accent)]"
              />
            </label>
          </div>
        </form>
      </Sheet>

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent
          open={confirmTarget !== null}
          title="Xoá mã giảm giá?"
          description={
            confirmTarget
              ? confirmTarget.usedCount > 0
                ? `Mã ${confirmTarget.code} đã được dùng ${confirmTarget.usedCount} lần nên backend sẽ từ chối xoá. Hãy tắt mã thay vì xoá.`
                : `Mã ${confirmTarget.code} sẽ bị xoá hẳn.`
              : undefined
          }
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setConfirmTarget(null)} disabled={deleting}>
                Huỷ
              </Button>
              <Button variant="danger" size="md" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                Xoá
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  );
}
