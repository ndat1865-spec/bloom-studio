import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Check, KeyRound, Loader2, Minus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/AdminShell";
import { InitialsAvatar } from "@/components/site/InitialsAvatar";
import { Field, Input, Label, NativeSelect } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Notice, TableRowSkeleton } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { ApiError, ROLE_LABELS, api, type ManagedUser, type Role } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Nhan vien & phan quyen — chi ADMIN (route boc AdminOnly, backend /users/** cung chi ADMIN).
 *
 * - Tao tai khoan nhan vien (hoac ADMIN khac) ngay tai day; khach hang tu dang ky ben cua hang.
 * - Doi quyen: nang khach thanh nhan vien, ha nhan vien ve khach... Khong tu doi quyen cua
 *   minh va khong ha ADMIN cuoi cung (backend chan, giao dien an san lua chon).
 * - Quyen moi co hieu luc tu lan dang nhap sau: role nam trong JWT da cap.
 */

type Tab = "team" | "customers";

const ROLE_TONE: Record<Role, string> = {
  ADMIN: "bg-accent/12 text-accent ring-accent/25",
  STAFF: "bg-info/12 text-info ring-info/25",
  CUSTOMER: "bg-surface-raised text-muted-foreground ring-border",
};

/** Bang quyen hien ben canh form - nhin mot lan la biet nhan vien lam duoc gi. */
const PERMISSIONS: { label: string; staff: boolean }[] = [
  { label: "Xử lý đơn, tạo vận đơn GHN, hoàn tiền", staff: true },
  { label: "Quản lý hoa, danh mục, duyệt đánh giá", staff: true },
  { label: "Xem bảng điều khiển, nhật ký email", staff: true },
  { label: "Xem mã giảm giá", staff: true },
  { label: "Tạo / sửa / tắt mã giảm giá", staff: false },
  { label: "Khoá API đối tác", staff: false },
  { label: "Quản lý nhân viên", staff: false },
];

export default function AdminStaffPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("team");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Form tao tai khoan
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Hop thoai xoa / dat lai mat khau
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setUsers(await api.listUsers());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không tải được danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const adminCount = users?.filter((u) => u.role === "ADMIN").length ?? 0;
  const team = useMemo(() => users?.filter((u) => u.role !== "CUSTOMER") ?? [], [users]);
  const customers = useMemo(() => users?.filter((u) => u.role === "CUSTOMER") ?? [], [users]);
  const rows = tab === "team" ? team : customers;

  /** Khong tu doi quyen minh; khong ha ADMIN cuoi cung. */
  function roleLocked(u: ManagedUser): string | null {
    if (u.id === me?.id) return "Tài khoản của bạn";
    if (u.role === "ADMIN" && adminCount <= 1) return "ADMIN cuối cùng";
    return null;
  }

  async function changeRole(u: ManagedUser, next: Role) {
    if (next === u.role) return;
    setBusyId(u.id);
    setNotice(null);
    try {
      const updated = await api.updateUser(u.id, { role: next });
      setUsers((list) => list?.map((x) => (x.id === u.id ? { ...x, ...updated } : x)) ?? null);
      setNotice({
        tone: "success",
        text: `@${u.username} giờ là ${ROLE_LABELS[next]}. Quyền mới có hiệu lực từ lần đăng nhập sau.`,
      });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không đổi được quyền." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[A-Za-z0-9._-]{3,100}$/.test(username.trim())) {
      next.username = "3–100 ký tự: chữ không dấu, số, dấu chấm, gạch.";
    }
    if (password.length < 6) next.password = "Mật khẩu cần ít nhất 6 ký tự.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setNotice(null);
    try {
      const created = await api.createStaff({ username: username.trim(), password, fullName: fullName.trim(), role });
      setUsers((list) => (list ? [...list, created] : [created]));
      setTab("team");
      setNotice({ tone: "success", text: `Đã tạo tài khoản @${created.username} (${ROLE_LABELS[created.role]}).` });
      setUsername("");
      setFullName("");
      setPassword("");
      setRole("STAFF");
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không tạo được tài khoản." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDialogBusy(true);
    try {
      await api.deleteUser(deleteTarget.id);
      setUsers((list) => list?.filter((u) => u.id !== deleteTarget.id) ?? null);
      setNotice({ tone: "success", text: `Đã xoá tài khoản @${deleteTarget.username}.` });
      setDeleteTarget(null);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không xoá được tài khoản." });
      setDeleteTarget(null);
    } finally {
      setDialogBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!passwordTarget || newPassword.length < 6) return;
    setDialogBusy(true);
    try {
      await api.updateUser(passwordTarget.id, { password: newPassword });
      setNotice({ tone: "success", text: `Đã đặt lại mật khẩu cho @${passwordTarget.username}.` });
      setPasswordTarget(null);
      setNewPassword("");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không đặt lại được mật khẩu." });
    } finally {
      setDialogBusy(false);
    }
  }

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Nhân viên"
        description="Tạo tài khoản cho nhân viên cửa hàng và phân quyền. Quyền mới có hiệu lực từ lần đăng nhập sau."
      />

      {notice ? (
        <Notice tone={notice.tone} className="mt-6">
          {notice.text}
        </Notice>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="accounts-heading" className="card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <h2 id="accounts-heading" className="text-base text-foreground">
              Tài khoản
            </h2>
            <div role="tablist" aria-label="Lọc tài khoản" className="inline-flex rounded-[var(--radius-sm)] bg-background p-1">
              {(
                [
                  ["team", `Nội bộ · ${team.length}`],
                  ["customers", `Khách hàng · ${customers.length}`],
                ] as [Tab, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    "num rounded-[calc(var(--radius-sm)-2px)] px-3 py-1.5 text-xs transition-colors",
                    tab === value ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table min-w-[34rem]">
              <caption className="sr-only">Tài khoản, quyền và thao tác</caption>
              <thead>
                <tr>
                  <th scope="col">Tài khoản</th>
                  <th scope="col">Quyền</th>
                  <th scope="col" className="text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)
                  : rows.map((u) => {
                      const locked = roleLocked(u);
                      const name = u.fullName || u.username;
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <InitialsAvatar name={name} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">
                                  {name}
                                  {u.id === me?.id ? (
                                    <span className="ml-2 text-xs font-normal text-subtle-foreground">(bạn)</span>
                                  ) : null}
                                </p>
                                <p className="truncate text-xs text-subtle-foreground">
                                  @{u.username}
                                  {u.email ? ` · ${u.email}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td>
                            {locked ? (
                              <span
                                title={locked}
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                                  ROLE_TONE[u.role],
                                )}
                              >
                                {ROLE_LABELS[u.role]}
                              </span>
                            ) : (
                              <div className="w-40">
                                <Label htmlFor={`role-${u.id}`} className="sr-only">
                                  Quyền của @{u.username}
                                </Label>
                                <NativeSelect
                                  id={`role-${u.id}`}
                                  value={u.role}
                                  disabled={busyId === u.id}
                                  onChange={(event) => void changeRole(u, event.target.value as Role)}
                                  className="h-8 text-[0.8125rem]"
                                >
                                  {(["STAFF", "ADMIN", "CUSTOMER"] as Role[]).map((r) => (
                                    <option key={r} value={r}>
                                      {ROLE_LABELS[r]}
                                    </option>
                                  ))}
                                </NativeSelect>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPasswordTarget(u);
                                  setNewPassword("");
                                }}
                              >
                                <KeyRound aria-hidden="true" />
                                <span className="sr-only">Đặt lại mật khẩu @{u.username}</span>
                              </Button>
                              {locked ? null : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hover:bg-danger/10 hover:text-danger"
                                  onClick={() => setDeleteTarget(u)}
                                >
                                  <Trash2 aria-hidden="true" />
                                  <span className="sr-only">Xoá @{u.username}</span>
                                </Button>
                              )}
                            </div>
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

          {!loading && !loadError && rows.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState
                title={tab === "team" ? "Chưa có nhân viên nào" : "Chưa có khách hàng nào"}
                description={
                  tab === "team"
                    ? "Tạo tài khoản nhân viên ở biểu mẫu bên cạnh."
                    : "Khách hàng tự đăng ký tài khoản ở cửa hàng."
                }
              />
            </div>
          ) : null}
        </section>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <form onSubmit={handleCreate} noValidate className="card p-5" aria-labelledby="create-heading">
            <h2 id="create-heading" className="flex items-center gap-2 text-base text-foreground">
              <UserPlus className="size-4 text-accent" aria-hidden="true" />
              Thêm tài khoản
            </h2>
            <div className="mt-4 space-y-4">
              <Field id="staff-username" label="Tên đăng nhập" error={errors.username} required>
                {(props) => (
                  <Input
                    {...props}
                    value={username}
                    maxLength={100}
                    autoComplete="off"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="nv.lan"
                  />
                )}
              </Field>
              <Field id="staff-fullname" label="Họ tên" error={errors.fullName}>
                {(props) => (
                  <Input
                    {...props}
                    value={fullName}
                    maxLength={100}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nguyễn Thị Lan"
                  />
                )}
              </Field>
              <Field id="staff-password" label="Mật khẩu" error={errors.password} hint="Ít nhất 6 ký tự. Gửi riêng cho nhân viên." required>
                {(props) => (
                  <Input
                    {...props}
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                )}
              </Field>
              <Field id="staff-role" label="Quyền" error={errors.role}>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={role}
                    onChange={(event) => setRole(event.target.value as "STAFF" | "ADMIN")}
                  >
                    <option value="STAFF">Nhân viên</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </NativeSelect>
                )}
              </Field>
            </div>
            <Button type="submit" variant="primary" size="md" className="mt-5 w-full" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
              Tạo tài khoản
            </Button>
          </form>

          <section aria-labelledby="perm-heading" className="card p-5">
            <h2 id="perm-heading" className="flex items-center gap-2 text-base text-foreground">
              <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
              Nhân viên làm được gì
            </h2>
            <ul className="mt-3 space-y-2">
              {PERMISSIONS.map((p) => (
                <li key={p.label} className="flex items-start gap-2 text-[0.8125rem]">
                  {p.staff ? (
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-label="Được" />
                  ) : (
                    <Minus className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" aria-label="Không" />
                  )}
                  <span className={p.staff ? "text-foreground" : "text-subtle-foreground"}>{p.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent
          open={deleteTarget !== null}
          title="Xoá tài khoản?"
          description={
            deleteTarget
              ? `@${deleteTarget.username} sẽ không đăng nhập được nữa. Đơn hàng cũ của tài khoản vẫn giữ nguyên.`
              : undefined
          }
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setDeleteTarget(null)} disabled={dialogBusy}>
                Huỷ
              </Button>
              <Button variant="danger" size="md" onClick={() => void handleDelete()} disabled={dialogBusy}>
                {dialogBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                Xoá
              </Button>
            </>
          }
        />
      </Dialog>

      <Dialog open={passwordTarget !== null} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <DialogContent
          open={passwordTarget !== null}
          title="Đặt lại mật khẩu"
          description={passwordTarget ? `Mật khẩu mới cho @${passwordTarget.username}.` : undefined}
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setPasswordTarget(null)} disabled={dialogBusy}>
                Huỷ
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => void handleResetPassword()}
                disabled={dialogBusy || newPassword.length < 6}
              >
                {dialogBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
                Lưu mật khẩu
              </Button>
            </>
          }
        >
          <Field id="reset-password" label="Mật khẩu mới" hint="Ít nhất 6 ký tự.">
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </Field>
        </DialogContent>
      </Dialog>
    </div>
  );
}
