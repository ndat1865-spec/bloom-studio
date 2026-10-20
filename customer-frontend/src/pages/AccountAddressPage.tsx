import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin, Pencil, Trash2, Truck } from "lucide-react";
import { AccountLayout } from "@/components/account/AccountLayout";
import { GhnAddressSelects } from "@/components/shop/GhnAddressSelects";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api } from "@/lib/api";
import type { ProfilePayload } from "@/lib/api";
import { useGhnAddress } from "@/lib/useGhnAddress";

/** So di dong Viet Nam 10 so — GHN tu choi so khac. Giong trang Thanh toan. */
const VN_PHONE = /^(0|84)\d{9}$/;

type AddressFields = Omit<ProfilePayload, "fullName" | "email">;

/**
 * Tai khoan > So dia chi. PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Pham vi: MOT dia chi mac dinh luu thang tren ban ghi user, khong phai bang dia chi rieng.
 * Trang Thanh toan doc lai cac truong nay de dien san form.
 *
 * Server bat GHN (options.ghnEnabled): chon Tinh / Quan / Phuong theo danh muc GHN, luu ca
 * ba ma de trang Thanh toan chon san va tinh phi ngay. Chua bat GHN thi giu hai o go tu do.
 */
export default function AccountAddressPage() {
  const { user, updateUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState(user?.address ?? "");
  const [city, setCity] = useState(user?.city ?? "");

  // Hong thi coi nhu chua bat GHN: van luu duoc dia chi go tu do
  const [ghnEnabled, setGhnEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api
      .getOrderOptions(controller.signal)
      .then((options) => setGhnEnabled(options.ghnEnabled))
      .catch(() => setGhnEnabled(false));
    return () => controller.abort();
  }, []);

  const ghn = useGhnAddress(ghnEnabled);

  if (!user) return null;

  const hasAddress = Boolean(user.address && user.address.trim());
  const hasGhnArea = Boolean(user.wardCode);
  const areaText = user.areaLabel || user.city;

  function startEditing() {
    setPhone(user?.phone ?? "");
    setAddress(user?.address ?? "");
    setCity(user?.city ?? "");
    if (user?.wardCode) {
      ghn.prefill({ provinceId: user.provinceId, districtId: user.districtId, wardCode: user.wardCode });
    } else {
      ghn.selectProvince(null);
    }
    setErrors({});
    setFormError(null);
    setNotice(null);
    setEditing(true);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (ghnEnabled) {
      if (phone.trim() && !VN_PHONE.test(phone.replace(/\D/g, ""))) {
        next.phone = "Số di động Việt Nam 10 chữ số, ví dụ 0901 234 567.";
      }
      if (ghn.provinceId == null) next.provinceId = "Chọn tỉnh/thành phố.";
      if (ghn.districtId == null) next.districtId = "Chọn quận/huyện.";
      if (!ghn.wardCode) next.wardCode = "Chọn phường/xã.";
      if (!address.trim()) next.address = "Nhập số nhà, tên đường.";
      else if (address.trim().length < 3) next.address = "Địa chỉ cần ít nhất 3 ký tự.";
    } else if (!address.trim()) {
      next.address = "Nhập địa chỉ giao hàng.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** Dung chung cho ca luu va xoa — chi khac gia tri truyen vao. */
  async function save(next: AddressFields, message: string) {
    if (!user) return;

    setSaving(true);
    setFormError(null);
    setErrors({});

    // Giu nguyen ho ten / email: trang nay khong quan ly hai truong do
    const payload: ProfilePayload = {
      fullName: user.fullName ?? "",
      email: user.email ?? "",
      ...next,
    };

    try {
      const updated = await api.updateProfile(payload);
      updateUser(updated);
      setEditing(false);
      setNotice(message);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setErrors(error.fieldErrors);
      setFormError(
        error instanceof Error ? error.message : "Không lưu được địa chỉ. Thử lại sau nhé.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    if (ghnEnabled) {
      // Chua doi khu vuc ma danh sach chua tai xong thi giu nhan cu
      const sameArea =
        ghn.provinceId === user?.provinceId &&
        ghn.districtId === user?.districtId &&
        ghn.wardCode === user?.wardCode;
      void save(
        {
          phone: phone.trim(),
          address: address.trim(),
          // Ten phuong/quan/tinh nam o areaLabel, bo o "Quan / Thanh pho" go tay cu
          city: "",
          provinceId: ghn.provinceId,
          districtId: ghn.districtId,
          wardCode: ghn.wardCode,
          areaLabel: ghn.areaLabel ?? (sameArea ? user?.areaLabel ?? "" : ""),
        },
        "Đã lưu địa chỉ mặc định.",
      );
      return;
    }
    // Go tu do thay cho dia chi GHN cu -> xoa luon ba ma GHN de khong lech nhau
    void save({ phone, address, city, wardCode: "" }, "Đã lưu địa chỉ mặc định.");
  }

  function handleRemove() {
    void save({ phone: "", address: "", city: "", wardCode: "" }, "Đã xoá địa chỉ mặc định.");
  }

  return (
    <AccountLayout
      eyebrow="Giao hàng"
      title="Sổ địa chỉ"
      description="Địa chỉ mặc định được điền sẵn khi bạn thanh toán, không phải gõ lại mỗi lần đặt hoa."
      action={
        !editing && hasAddress ? (
          <Button variant="outline" size="md" onClick={startEditing}>
            <Pencil aria-hidden="true" />
            Sửa địa chỉ
          </Button>
        ) : null
      }
    >
      {notice ? (
        <div className="mb-8">
          <Notice tone="success">{notice}</Notice>
        </div>
      ) : null}

      {editing ? (
        <section aria-labelledby="address-form-heading" className="bg-surface p-7">
          <h2
            id="address-form-heading"
            className="border-b border-border pb-5 font-display text-2xl font-semibold italic text-foreground"
          >
            Địa chỉ mặc định
          </h2>

          <form onSubmit={handleSubmit} noValidate className="mt-7 max-w-xl space-y-6">
            {formError ? <Notice tone="error">{formError}</Notice> : null}

            <Field
              id="phone"
              label="Số điện thoại nhận hàng"
              error={errors.phone}
              hint="Người giao hoa sẽ gọi số này."
            >
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

            {ghnEnabled ? (
              <>
                <GhnAddressSelects ghn={ghn} errors={errors} required />
                <Field
                  id="address"
                  label="Số nhà, tên đường"
                  error={errors.address}
                  hint="Tên phường, quận, tỉnh được ghép tự động theo lựa chọn ở trên."
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      autoComplete="address-line1"
                      maxLength={150}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="12 Nguyễn Huệ"
                    />
                  )}
                </Field>
                <p className="flex items-start gap-2.5 text-xs font-light leading-relaxed text-muted-foreground">
                  <Truck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>
                    Giao bởi Giao Hàng Nhanh (GHN). Lưu khu vực theo danh mục GHN thì trang thanh
                    toán chọn sẵn và tính phí giao ngay, không phải chọn lại.
                  </span>
                </p>
              </>
            ) : (
              <>
                <Field id="address" label="Địa chỉ giao hàng" error={errors.address}>
                  {(props) => (
                    <Input
                      {...props}
                      autoComplete="street-address"
                      maxLength={255}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Số nhà, đường, phường"
                    />
                  )}
                </Field>

                <Field id="city" label="Quận / Thành phố" error={errors.city}>
                  {(props) => (
                    <Input
                      {...props}
                      autoComplete="address-level2"
                      maxLength={60}
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Hà Nội"
                    />
                  )}
                </Field>
              </>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" variant="primary" size="lg" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Đang lưu…
                  </>
                ) : (
                  "Lưu địa chỉ"
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
        </section>
      ) : hasAddress ? (
        <section aria-labelledby="address-heading" className="bg-surface p-7">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-5">
            <h2
              id="address-heading"
              className="font-display text-2xl font-semibold italic text-foreground"
            >
              Địa chỉ mặc định
            </h2>
            <span className="label-micro text-accent">Đang dùng</span>
          </div>

          <div className="mt-7 flex gap-5">
            <span
              aria-hidden="true"
              className="inline-flex size-11 shrink-0 items-center justify-center bg-surface-raised text-accent"
            >
              <MapPin className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-base text-foreground">
                {user.displayName || user.fullName || user.username}
              </p>
              {user.phone ? (
                <p className="num mt-1.5 text-sm text-muted-foreground">{user.phone}</p>
              ) : (
                <p className="mt-1.5 text-sm font-light text-muted-foreground/60">
                  Chưa có số điện thoại
                </p>
              )}
              <p className="mt-4 text-sm font-light leading-relaxed text-muted-foreground">
                {[user.address, areaText].filter(Boolean).join(", ")}
              </p>
              {hasGhnArea ? (
                <p className="label-micro mt-3 flex items-center gap-1.5 text-accent">
                  <Truck className="size-3.5" aria-hidden="true" />
                  Khu vực giao GHN
                </p>
              ) : null}
            </div>
          </div>

          {ghnEnabled && !hasGhnArea ? (
            <p className="mt-6 flex items-start gap-2.5 border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-light leading-relaxed text-foreground">
              <Truck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                Địa chỉ này chưa chọn Tỉnh / Quận / Phường theo GHN. Bấm <em>Sửa địa chỉ</em> để
                chọn, lần sau trang thanh toán sẽ điền sẵn và tính phí giao ngay.
              </span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
            <Button variant="outline" size="md" onClick={startEditing} disabled={saving}>
              <Pencil aria-hidden="true" />
              Sửa địa chỉ
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={handleRemove}
              disabled={saving}
              className="hover:text-danger"
            >
              {saving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              Xoá địa chỉ
            </Button>
          </div>

          <p className="mt-6 text-xs font-light leading-relaxed text-muted-foreground">
            Địa chỉ này được điền sẵn ở trang{" "}
            <Link to="/checkout" className="text-accent transition-colors hover:text-accent-strong">
              Thanh toán
            </Link>
            . Bạn vẫn sửa được cho từng đơn mà không ảnh hưởng địa chỉ đã lưu.
          </p>
        </section>
      ) : (
        <EmptyState
          title="Chưa có địa chỉ nào"
          description="Lưu một địa chỉ mặc định để những lần đặt hoa sau không phải nhập lại thông tin giao hàng."
          action={
            <Button variant="primary" size="lg" onClick={startEditing}>
              Thêm địa chỉ mặc định
            </Button>
          }
        />
      )}
    </AccountLayout>
  );
}
