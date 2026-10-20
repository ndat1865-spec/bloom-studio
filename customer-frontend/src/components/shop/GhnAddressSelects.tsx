import { Field, NativeSelect } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import type { GhnAddress } from "@/lib/useGhnAddress";

type Props = {
  ghn: GhnAddress;
  errors?: { provinceId?: string; districtId?: string; wardCode?: string };
  required?: boolean;
};

/**
 * Ba o chon Tinh / Quan / Phuong theo danh muc GHN.
 * Dung chung cho trang Thanh toan va So dia chi, trang thai nam trong useGhnAddress.
 */
export function GhnAddressSelects({ ghn, errors = {}, required = false }: Props) {
  return (
    <div className="space-y-6">
      {ghn.error ? <Notice tone="error">{ghn.error}</Notice> : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Field id="provinceId" label="Tỉnh / Thành phố" error={errors.provinceId} required={required}>
          {(props) => (
            <NativeSelect
              {...props}
              value={ghn.provinceId ?? ""}
              onChange={(event) => ghn.selectProvince(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">{ghn.provinces.length ? "Chọn tỉnh/thành" : "Đang tải…"}</option>
              {ghn.provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field id="districtId" label="Quận / Huyện" error={errors.districtId} required={required}>
          {(props) => (
            <NativeSelect
              {...props}
              value={ghn.districtId ?? ""}
              disabled={ghn.provinceId == null}
              onChange={(event) => ghn.selectDistrict(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">
                {ghn.districtId != null && !ghn.districts.length ? "Đang tải…" : "Chọn quận/huyện"}
              </option>
              {ghn.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field id="wardCode" label="Phường / Xã" error={errors.wardCode} required={required}>
          {(props) => (
            <NativeSelect
              {...props}
              value={ghn.wardCode}
              disabled={ghn.districtId == null}
              onChange={(event) => ghn.selectWard(event.target.value)}
            >
              <option value="">
                {ghn.wardCode && !ghn.wards.length ? "Đang tải…" : "Chọn phường/xã"}
              </option>
              {ghn.wards.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>
    </div>
  );
}
