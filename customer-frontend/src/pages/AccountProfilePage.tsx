import { useEffect, useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AccountLayout, AccountStats } from "@/components/account/AccountLayout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api } from "@/lib/api";
import type { ProfilePayload } from "@/lib/api";

/**
 * Tai khoan > Thong tin ca nhan. PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Xem va sua ho ten / email / so dien thoai.
 * Dia chi giao hang nam o trang rieng (So dia chi) nen form nay khong dung toi.
 */
export default function AccountProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Lien ket Google
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [googleAvailable, setGoogleAvailable] = useState(true);

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  // So don hang cua chinh minh — dung cho hang chi so phia tren
  const [orderStats, setOrderStats] = useState<{ total: number; pending: number } | null>(null);

  const userId = user?.id;

  useEffect(() => {
    if (userId == null) return;
    const controller = new AbortController();

    // size lon de dem duoc trang thai; bai thuc hanh chi co vai don nen khong dang ngai
    api
      .listMyOrders(0, 100, controller.signal)
      .then((page) => {
        const pending = page.content.filter(
          (order) => ["PENDING", "CONFIRMED", "PREPARING", "SHIPPING"].includes(order.status),
        ).length;
        setOrderStats({ total: page.totalElements, pending });
      })
      .catch(() => {
        /* hong phan thong ke thi trang van dung duoc, chi hien dau gach */
      });

    return () => controller.abort();
  }, [userId]);

  if (!user) return null;

  function startEditing() {
    setFullName(user?.fullName ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
    setErrors({});
    setFormError(null);
    setSaved(false);
    setEditing(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setFormError(null);
    setErrors({});

    // Giu nguyen dia chi: form nay khong quan ly dia chi nen gui lai gia tri cu,
    // neu khong backend se hieu la nguoi dung muon xoa trong.
    const payload: ProfilePayload = {
      fullName,
      email,
      phone,
      address: user.address ?? "",
      city: user.city ?? "",
    };

    try {
      const updated = await api.updateProfile(payload);
      updateUser(updated);
      setEditing(false);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setFormError(
        error instanceof Error ? error.message : "Không lưu được hồ sơ. Thử lại sau nhé.",
      );
    } finally {
      setSaving(false);
    }
  }

  const name = user.displayName || user.fullName || user.username;

  async function linkGoogle(credential: string) {
    setLinking(true);
    setLinkError(null);
    try {
      updateUser(await api.linkGoogle(credential));
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Không liên kết được Google.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <AccountLayout
      eyebrow="Tài khoản Bloom Studio"
      title={"Xin chào, " + name}
      description="Quản lý thông tin cá nhân, địa chỉ giao hàng và đơn hàng của bạn tại một nơi."
      action={
        !editing ? (
          <Button variant="outline" size="md" onClick={startEditing}>
            <Pencil aria-hidden="true" />
            Chỉnh sửa hồ sơ
          </Button>
        ) : null
      }
    >
      <AccountStats
        items={[
          {
            label: "Tổng đơn hàng",
            value: orderStats?.total ?? "—",
            hint: "Xem lịch sử mua sắm",
          },
          {
            label: "Đang xử lý",
            value: orderStats?.pending ?? "—",
            hint: "Theo dõi tiến độ đơn",
          },
          {
            label: "Địa chỉ đã lưu",
            value: user.hasDefaultAddress ? 1 : 0,
            hint: "Quản lý nơi nhận hàng",
          },
          {
            label: "Loại tài khoản",
            value: user.role === "ADMIN" ? "Admin" : user.role === "STAFF" ? "Nhân viên" : "Khách",
            hint: "Đăng nhập bằng " + user.username,
          },
        ]}
      />

      <section aria-labelledby="profile-heading" className="mt-10 bg-surface p-7">
        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="label-micro text-accent">Hồ sơ</p>
            <h2
              id="profile-heading"
              className="mt-2 font-display text-2xl font-semibold italic text-foreground"
            >
              Thông tin cá nhân
            </h2>
          </div>
          <p className="hidden text-xs font-light text-muted-foreground sm:block">
            Dùng cho đơn hàng và hỗ trợ
          </p>
        </div>

        {saved ? (
          <div className="mt-6">
            <Notice tone="success">Đã lưu thông tin cá nhân.</Notice>
          </div>
        ) : null}

        {editing ? (
          <form onSubmit={handleSubmit} noValidate className="mt-7 max-w-xl space-y-6">
            {formError ? <Notice tone="error">{formError}</Notice> : null}

            <Field id="fullName" label="Họ và tên" error={errors.fullName}>
              {(props) => (
                <Input
                  {...props}
                  autoComplete="name"
                  maxLength={100}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              )}
            </Field>

            <Field
              id="email"
              label="Email"
              error={errors.email}
              hint="Dùng để gửi xác nhận đơn hàng."
            >
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="email"
                  maxLength={150}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ban@email.com"
                />
              )}
            </Field>

            <Field id="phone" label="Số điện thoại" error={errors.phone}>
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0900 123 456"
                />
              )}
            </Field>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" variant="primary" size="lg" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Đang lưu…
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Huỷ
              </Button>
            </div>
          </form>
        ) : (
          <dl className="mt-7 grid grid-cols-1 gap-x-12 gap-y-7 sm:grid-cols-2">
            <ReadOnly label="Họ và tên" value={user.fullName} empty="Chưa đặt tên hiển thị" />
            <ReadOnly label="Email đăng nhập" value={user.email} empty="Chưa có email" />
            <ReadOnly label="Số điện thoại" value={user.phone} empty="Chưa có số điện thoại" />
            <ReadOnly label="Tên đăng nhập" value={user.username} empty="" />
          </dl>
        )}
      </section>

      {/*
        Lien ket Google: chi tai khoan khach, va chi khi backend bat Google. Tai khoan tao
        bang Google thi da lien ket san - khoi nay chi con bao trang thai.
      */}
      {user.role === "CUSTOMER" && (user.googleLinked || googleAvailable) ? (
        <section aria-labelledby="google-heading" className="mt-6 bg-surface p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 id="google-heading" className="font-display text-xl font-semibold italic text-foreground">
                Đăng nhập bằng Google
              </h2>
              <p className="mt-2 max-w-md text-sm font-light leading-relaxed text-muted-foreground">
                {user.googleLinked
                  ? "Tài khoản đã liên kết với Google. Lần sau bấm “Đăng nhập bằng Google”, không cần nhớ mật khẩu."
                  : "Liên kết tài khoản Google để lần sau đăng nhập một chạm. Đơn hàng và địa chỉ vẫn giữ nguyên."}
              </p>
              {linkError ? (
                <p role="alert" className="mt-3 text-xs text-danger">
                  {linkError}
                </p>
              ) : null}
            </div>
            {user.googleLinked ? (
              <span className="inline-flex shrink-0 items-center gap-2 text-sm text-success">
                <Check className="size-4" aria-hidden="true" />
                Đã liên kết
              </span>
            ) : (
              <GoogleButton
                className="w-full shrink-0 sm:w-72"
                text="continue_with"
                busy={linking}
                onCredential={(credential) => void linkGoogle(credential)}
                onError={setLinkError}
                onAvailable={setGoogleAvailable}
              />
            )}
          </div>
        </section>
      ) : null}
    </AccountLayout>
  );
}

/** Mot o chi de doc. Chua co du lieu thi noi ro la chua co, khong de trong khong. */
function ReadOnly({
  label,
  value,
  empty,
}: {
  label: string;
  value: string | null | undefined;
  empty: string;
}) {
  const filled = Boolean(value && value.trim());
  return (
    <div>
      <dt className="label-micro text-muted-foreground">{label}</dt>
      <dd
        className={
          filled
            ? "mt-2.5 text-base text-foreground"
            : "mt-2.5 text-base font-light text-muted-foreground/60"
        }
      >
        {filled ? value : empty}
      </dd>
    </div>
  );
}
