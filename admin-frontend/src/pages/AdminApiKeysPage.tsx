import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Ban, Check, Copy, KeyRound, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/AdminShell";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Notice, TableRowSkeleton } from "@/components/ui/feedback";
import { ApiError, api, type ApiKey, type ApiKeyCreated } from "@/lib/api";

/**
 * Trang quan tri khoa API cua doi tac ngoai.
 *
 * Diem cot loi cua man hinh nay: khoa goc chi hien DUNG MOT LAN, ngay sau khi cap.
 * Sau do he thong chi con SHA-256 nen khong the doc lai — bang ben duoi khong bao gio
 * co cot nao chua khoa that, chi co keyPrefix.
 */

/** Scope khai o Gateway. Them route /api/public/** moi thi bo sung o ca hai noi. */
const SCOPES = [{ value: "products:read", label: "products:read — đọc danh sách hoa" }];

const HAN_DUNG = [
  { value: "30", label: "30 ngày" },
  { value: "90", label: "90 ngày" },
  { value: "365", label: "1 năm" },
  { value: "", label: "Không hết hạn" },
];

/** Han muc request/phut - Gateway tra 429 khi doi tac vuot. */
const GIOI_HAN = [10, 60, 300, 1000];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function trangThai(key: ApiKey) {
  if (key.status === "REVOKED")
    return { text: "Đã thu hồi", tone: "bg-danger/12 text-danger", dot: "bg-danger" };
  if (!key.usable)
    return { text: "Hết hạn", tone: "bg-warning/12 text-warning", dot: "bg-warning" };
  return { text: "Đang dùng", tone: "bg-success/12 text-success", dot: "bg-success" };
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [scope, setScope] = useState(SCOPES[0].value);
  const [daysValid, setDaysValid] = useState("30");
  const [rateLimit, setRateLimit] = useState("60");
  const [ownerError, setOwnerError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  /** Khoa vua cap — giu trong bo nho trang, mat khi F5 va khong the lay lai. */
  const [justCreated, setJustCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmRevoke, setConfirmRevoke] = useState<ApiKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiKey | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setKeys(await api.listApiKeys());
    } catch (error) {
      setKeys(null);
      setLoadError(error instanceof Error ? error.message : "Không tải được danh sách khoá.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setOwnerName("");
    setScope(SCOPES[0].value);
    setDaysValid("30");
    setRateLimit("60");
    setOwnerError(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const trimmed = ownerName.trim();
    if (!trimmed) {
      setOwnerError("Nhập tên đối tác.");
      return;
    }
    if (trimmed.length > 100) {
      setOwnerError("Tên đối tác tối đa 100 ký tự.");
      return;
    }
    setOwnerError(undefined);

    setSaving(true);
    try {
      const created = await api.createApiKey({
        ownerName: trimmed,
        scopes: [scope],
        daysValid: daysValid === "" ? null : Number(daysValid),
        rateLimitPerMinute: Number(rateLimit),
      });
      setJustCreated(created);
      setCopied(false);
      resetForm();
      await load();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.ownerName) {
        setOwnerError(error.fieldErrors.ownerName);
      }
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Không cấp được khoá.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Trinh duyet chan clipboard (thuong la khi khong chay tren HTTPS): de ADMIN tu boi den chep.
      setNotice({ tone: "error", text: "Trình duyệt chặn sao chép tự động — hãy bôi đen và chép tay." });
    }
  }

  async function handleRateLimit(key: ApiKey, value: number) {
    try {
      await api.updateApiKeyRateLimit(key.id, value);
      setNotice({
        tone: "success",
        text: `Khoá của "${key.ownerName}": ${value} request/phút. Có hiệu lực trong vòng 1 phút.`,
      });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không đổi được giới hạn." });
    }
  }

  async function handleRevoke() {
    if (!confirmRevoke) return;
    setWorking(true);
    try {
      await api.revokeApiKey(confirmRevoke.id);
      setNotice({ tone: "success", text: `Đã thu hồi khoá của "${confirmRevoke.ownerName}".` });
      setConfirmRevoke(null);
      await load();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Không thu hồi được khoá.",
      });
      setConfirmRevoke(null);
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setWorking(true);
    try {
      await api.deleteApiKey(confirmDelete.id);
      setNotice({ tone: "success", text: `Đã xoá hẳn khoá của "${confirmDelete.ownerName}".` });
      setConfirmDelete(null);
      await load();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Không xoá được khoá.",
      });
      setConfirmDelete(null);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Khoá API đối tác"
        description={
          <>
            Khoá cho đối tác ngoài gọi <code className="text-foreground">/api/public/**</code> bằng
            header <code className="text-foreground">X-API-KEY</code>. Hệ thống chỉ lưu bản băm —
            khoá gốc chỉ hiện đúng một lần ngay sau khi cấp.
          </>
        }
      />

      {justCreated ? (
        <section
          aria-labelledby="new-key-heading"
          className="mt-6 rounded-[var(--radius-md)] border border-accent/50 bg-accent-soft/50 p-5"
        >
          <h2 id="new-key-heading" className="flex items-center gap-2 text-base text-foreground">
            <KeyRound aria-hidden="true" className="size-4 text-accent" />
            Khoá của &ldquo;{justCreated.key.ownerName}&rdquo;
          </h2>
          <p className="mt-1 text-sm text-accent">{justCreated.warning}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="num flex-1 break-all rounded-[var(--radius-sm)] border border-border bg-background px-3 py-2 text-foreground">
              {justCreated.keyValue}
            </code>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleCopy(justCreated.keyValue)}
            >
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? "Đã chép" : "Chép khoá"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setJustCreated(null);
                setCopied(false);
              }}
            >
              Tôi đã lưu, ẩn đi
            </Button>
          </div>
        </section>
      ) : null}

      {notice ? (
        <Notice tone={notice.tone} className="mt-6">
          {notice.text}
        </Notice>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* min-w-0: o luoi, con mac dinh la min-width:auto nen bang rong hon se day
            ca trang tran ngang thay vi tu cuon trong khung overflow-x-auto. */}
        <section aria-labelledby="key-list-heading" className="card min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4">
            <div className="flex items-baseline gap-2">
              <h2 id="key-list-heading" className="text-base text-foreground">
                Khoá đã cấp
              </h2>
              {keys ? (
                <span className="num text-xs text-muted-foreground">{keys.length} khoá</span>
              ) : null}
            </div>
            <span className="text-xs text-subtle-foreground">
              Thu hồi có thể chậm tới 1 phút do Gateway nhớ kết quả kiểm tra
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table min-w-[52rem]">
              <caption className="sr-only">
                Danh sách khoá API với chủ sở hữu, quyền, trạng thái và lần dùng gần nhất
              </caption>
              <thead>
                <tr>
                  <th scope="col">Đối tác</th>
                  <th scope="col">Khoá</th>
                  <th scope="col">Quyền</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Giới hạn</th>
                  <th scope="col">Dùng gần nhất</th>
                  <th scope="col" className="text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <TableRowSkeleton key={index} columns={7} />
                    ))
                  : keys?.map((key) => {
                      const status = trangThai(key);
                      return (
                        <tr key={key.id}>
                          <td className="text-foreground">
                            <span className="font-medium">{key.ownerName}</span>
                            <span className="num block text-xs text-subtle-foreground">#{key.id}</span>
                          </td>
                          <td>
                            <code className="rounded bg-surface-raised px-1.5 py-0.5 text-muted-foreground">
                              {key.keyPrefix}…
                            </code>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {key.scopes.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full bg-info/12 px-2 py-0.5 text-xs text-info"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.tone}`}
                            >
                              <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot}`} />
                              {status.text}
                            </span>
                            {key.expiresAt ? (
                              <span className="num mt-1 block text-xs text-subtle-foreground">
                                hạn {formatDate(key.expiresAt)}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <label className="sr-only" htmlFor={`rate-${key.id}`}>
                              Giới hạn request/phút của {key.ownerName}
                            </label>
                            <select
                              id={`rate-${key.id}`}
                              value={key.rateLimitPerMinute}
                              disabled={key.status !== "ACTIVE"}
                              onChange={(event) => void handleRateLimit(key, Number(event.target.value))}
                              className="num rounded-[var(--radius-sm)] border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-50"
                            >
                              {(GIOI_HAN.includes(key.rateLimitPerMinute)
                                ? GIOI_HAN
                                : [...GIOI_HAN, key.rateLimitPerMinute].sort((a, b) => a - b)
                              ).map((value) => (
                                <option key={value} value={value}>
                                  {value}/phút
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="num text-muted-foreground">{formatDate(key.lastUsedAt)}</td>
                          <td>
                            <div className="flex justify-end gap-1">
                              {key.status === "ACTIVE" ? (
                                <Button variant="outline" size="sm" onClick={() => setConfirmRevoke(key)}>
                                  <Ban aria-hidden="true" />
                                  Thu hồi
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-danger/10 hover:text-danger"
                                onClick={() => setConfirmDelete(key)}
                              >
                                <Trash2 aria-hidden="true" />
                                <span className="sr-only">Xoá khoá của {key.ownerName}</span>
                              </Button>
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

          {!loading && keys?.length === 0 ? (
            <div className="border-t border-border">
              <EmptyState
                title="Chưa cấp khoá nào"
                description="Cấp khoá đầu tiên ở biểu mẫu bên cạnh để đối tác gọi được /api/public/products."
              />
            </div>
          ) : null}
        </section>

        <section aria-labelledby="key-form-heading" className="lg:sticky lg:top-20 lg:self-start">
          <form onSubmit={handleSubmit} noValidate className="card p-5">
            <h2 id="key-form-heading" className="text-base text-foreground">
              Cấp khoá mới
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Khoá hiện một lần duy nhất sau khi cấp.
            </p>

            <div className="mt-5 space-y-4">
              <Field id="owner-name" label="Tên đối tác" error={ownerError} required>
                {(props) => (
                  <Input
                    {...props}
                    value={ownerName}
                    maxLength={100}
                    onChange={(event) => setOwnerName(event.target.value)}
                    placeholder="Công ty Hoa Tươi ABC"
                  />
                )}
              </Field>

              <Field id="scope" label="Quyền" required>
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                  >
                    {SCOPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>

              <Field id="rate-limit" label="Giới hạn tần suất" hint="Vượt quá thì Gateway trả 429">
                {(props) => (
                  <NativeSelect {...props} value={rateLimit} onChange={(event) => setRateLimit(event.target.value)}>
                    {GIOI_HAN.map((value) => (
                      <option key={value} value={String(value)}>
                        {value} request/phút
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>

              <Field id="days-valid" label="Hạn dùng">
                {(props) => (
                  <NativeSelect
                    {...props}
                    value={daysValid}
                    onChange={(event) => setDaysValid(event.target.value)}
                  >
                    {HAN_DUNG.map((item) => (
                      <option key={item.label} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="md" onClick={resetForm} disabled={saving}>
                <RotateCcw aria-hidden="true" />
                Làm mới
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Đang cấp…
                  </>
                ) : (
                  <>
                    <Plus aria-hidden="true" />
                    Cấp khoá
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <Dialog open={confirmRevoke !== null} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <DialogContent
          open={confirmRevoke !== null}
          title="Thu hồi khoá?"
          description={
            confirmRevoke
              ? `Khoá của "${confirmRevoke.ownerName}" (${confirmRevoke.keyPrefix}…) sẽ ngừng hiệu lực nhưng vẫn nằm trong danh sách để truy vết. Gateway có thể còn cho qua tới một phút do cache.`
              : undefined
          }
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setConfirmRevoke(null)} disabled={working}>
                Huỷ
              </Button>
              <Button variant="danger" size="md" onClick={handleRevoke} disabled={working}>
                {working ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Đang thu hồi…
                  </>
                ) : (
                  <>
                    <Ban aria-hidden="true" />
                    Thu hồi
                  </>
                )}
              </Button>
            </>
          }
        />
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent
          open={confirmDelete !== null}
          title="Xoá hẳn khoá?"
          description={
            confirmDelete
              ? `Khoá của "${confirmDelete.ownerName}" bị xoá khỏi cơ sở dữ liệu, không còn dấu vết để truy lại. Thường nên thu hồi thay vì xoá.`
              : undefined
          }
          footer={
            <>
              <Button variant="outline" size="md" onClick={() => setConfirmDelete(null)} disabled={working}>
                Huỷ
              </Button>
              <Button variant="danger" size="md" onClick={handleDelete} disabled={working}>
                {working ? (
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
