import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Place, type Ward } from "@/lib/api";

export type GhnSelection = {
  provinceId: number | null;
  districtId: number | null;
  wardCode: string;
};

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Chon dia chi theo danh muc dia gioi GHN: Tinh -> Quan -> Phuong.
 * Dung chung cho trang Thanh toan va So dia chi.
 *
 * Doi tinh thi xoa quan + phuong NGAY TRONG HAM CHON, khong xoa trong useEffect.
 * Nho vay prefill() dat ca ba ma mot luc duoc (dien san tu dia chi mac dinh):
 * cac effect chi tai danh sach theo ma dang chon, khong ghi de lua chon.
 */
export function useGhnAddress(enabled: boolean, allowedProvinceIds?: number[]) {
  const [provinces, setProvinces] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<Place[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [wardCode, setWardCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Trang Dat hoa chi cho chon tinh trong vung giao cua studio; So dia chi thi khong loc
  const allowedKey = (allowedProvinceIds ?? []).join(",");

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const allowed = allowedKey ? allowedKey.split(",").map(Number) : [];
    api
      .listProvinces(controller.signal)
      .then((all) => setProvinces(allowed.length ? all.filter((p) => allowed.includes(p.id)) : all))
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        setError(err instanceof Error ? err.message : "Không tải được danh sách tỉnh/thành.");
      });
    return () => controller.abort();
  }, [enabled, allowedKey]);

  // Vung giao chi co mot tinh: chon san, khach chi can chon quan / phuong
  useEffect(() => {
    if (provinces.length === 1 && allowedKey && provinceId == null) {
      setProvinceId(provinces[0].id);
    }
  }, [provinces, allowedKey, provinceId]);

  useEffect(() => {
    if (!enabled || provinceId == null) return;
    const controller = new AbortController();
    api
      .listDistricts(provinceId, controller.signal)
      .then(setDistricts)
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        setError(err instanceof Error ? err.message : "Không tải được danh sách quận/huyện.");
      });
    return () => controller.abort();
  }, [enabled, provinceId]);

  useEffect(() => {
    if (!enabled || districtId == null) return;
    const controller = new AbortController();
    api
      .listWards(districtId, controller.signal)
      .then(setWards)
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        setError(err instanceof Error ? err.message : "Không tải được danh sách phường/xã.");
      });
    return () => controller.abort();
  }, [enabled, districtId]);

  const selectProvince = useCallback((id: number | null) => {
    setProvinceId(id);
    setDistrictId(null);
    setWardCode("");
    setDistricts([]);
    setWards([]);
  }, []);

  const selectDistrict = useCallback((id: number | null) => {
    setDistrictId(id);
    setWardCode("");
    setWards([]);
  }, []);

  /** Dat ca ba ma mot luc. Thieu ma nao thi bo qua, khong dien nua voi. */
  const prefill = useCallback((next: Partial<GhnSelection>) => {
    if (next.provinceId == null || next.districtId == null || !next.wardCode) return;
    setProvinceId(next.provinceId);
    setDistrictId(next.districtId);
    setWardCode(next.wardCode);
  }, []);

  /**
   * "Phuong X, Quan Y, Tinh Z" tu danh sach da tai. Danh sach chua tai xong
   * (vua prefill) thi tra null — ben goi tu quyet dinh dung nhan cu hay cho.
   */
  const areaLabel = useMemo(() => {
    const ward = wards.find((w) => w.code === wardCode)?.name;
    const district = districts.find((d) => d.id === districtId)?.name;
    const province = provinces.find((p) => p.id === provinceId)?.name;
    return ward && district && province ? `${ward}, ${district}, ${province}` : null;
  }, [wards, districts, provinces, wardCode, districtId, provinceId]);

  return {
    provinces,
    districts,
    wards,
    provinceId,
    districtId,
    wardCode,
    error,
    areaLabel,
    complete: provinceId != null && districtId != null && wardCode !== "",
    selectProvince,
    selectDistrict,
    selectWard: setWardCode,
    prefill,
  };
}

export type GhnAddress = ReturnType<typeof useGhnAddress>;
