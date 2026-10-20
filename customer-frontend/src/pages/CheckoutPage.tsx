import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronRight, CreditCard, Gift, Loader2, MapPin, Minus, Plus, TicketPercent, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { CheckoutSteps } from "@/components/shop/CheckoutSteps";
import { GhnAddressSelects } from "@/components/shop/GhnAddressSelects";
import { VoucherPickerDialog } from "@/components/shop/VoucherPickerDialog";
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD, useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  NetworkError,
  api,
  type OnlineProvider,
  type OrderOptions,
  type PaymentMethodCode,
  type PaymentMethodOption,
  type MyVoucher,
  type VoucherCheck,
} from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { describeDay, earliestDeliveryDate } from "@/lib/delivery";
import { useGhnAddress } from "@/lib/useGhnAddress";

type Errors = Partial<
  Record<
    | "customerName"
    | "phone"
    | "address"
    | "city"
    | "provinceId"
    | "districtId"
    | "wardCode"
    | "deliveryDate"
    | "timeSlot"
    | "note"
    | "senderName"
    | "senderPhone"
    | "cardMessage",
    string
  >
>;

/** Can 1 tieng chuan bi hoa — giong quy tac o order-service. */
const PREP_HOURS = 1;

/** Nhom khung giao 1 tieng theo buoi - khop DeliverySlot cua order-service. */
const DAY_PARTS = [
  { label: "Sáng", from: 8, to: 12 },
  { label: "Chiều", from: 12, to: 17 },
  { label: "Tối", from: 17, to: 21 },
];

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** So di dong Viet Nam 10 so — GHN tu choi so khac. */
const VN_PHONE = /^(0|84)\d{9}$/;

/**
 * Thanh toan — PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Them cac tuy chon qua tang: nguoi tang khac nguoi nhan, thiep + loi chuc, qua kem,
 * khung gio giao va ma giam gia. Moi con so o khoi tom tat chi la XEM TRUOC: server
 * tinh lai toan bo tu gia trong CSDL khi dat hang.
 *
 * Giao hang: khi server bat GHN (options.ghnEnabled), dia chi chon Tinh / Quan / Phuong
 * theo danh muc GHN va phi giao hang hoi GHN theo phuong da chon. Chua bat GHN thi giu
 * cach cu: hai o go tu do (duong + quan/thanh pho), phi co dinh.
 *
 * Thanh toan: COD, hoac VNPay / MoMo / ZaloPay — dat don xong thi xin link o
 * payment-service roi chuyen trinh duyet sang cong thanh toan.
 */
export default function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ---------- nguoi nhan / nguoi tang ----------
  const [isGift, setIsGift] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [anonymousSender, setAnonymousSender] = useState(false);

  // ---------- dia chi + thoi gian ----------
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  /** Gio bat dau cua khung giao 1 tieng; null = luc nao cung duoc. */
  const [deliveryHour, setDeliveryHour] = useState<number | null>(null);
  const [note, setNote] = useState("");

  // ---------- phi GHN (chon Tinh / Quan / Phuong nam trong useGhnAddress ben duoi) ----------
  const [ghnFee, setGhnFee] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // ---------- thanh toan ----------
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>("COD");

  // ---------- thiep + qua ----------
  const [options, setOptions] = useState<OrderOptions | null>(null);
  const [cardType, setCardType] = useState("NONE");
  const [cardMessage, setCardMessage] = useState("");
  const [addons, setAddons] = useState<Record<string, number>>({});

  // ---------- ma giam gia ----------
  const [voucher, setVoucher] = useState<VoucherCheck | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  // Vi ma cua khach (ma chung + ma rieng), danh gia theo gia tri don hien tai
  const [wallet, setWallet] = useState<MyVoucher[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Don da tao, dang roi trang (sang cong thanh toan / trang don). Gio da xoa nen KHONG
  // duoc hien "gio trong" trong luc cho - truoc day khach thay man nay khi sang VNPay.
  const [leaving, setLeaving] = useState<number | null>(null);

  // Khach bam Back tu cong thanh toan: trinh duyet co the khoi phuc nguyen trang (bfcache)
  // voi man "dang chuyen" quay mai -> dua ve trang don vua tao, o do co nut thanh toan lai.
  useEffect(() => {
    if (leaving == null) return;
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) navigate(`/orders/${leaving}`, { replace: true });
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [leaving, navigate]);

  const profileName = user ? user.displayName || user.fullName || user.username : "";

  /**
   * Dien san form tu ho so + dia chi mac dinh (PHAN MO RONG).
   * Chi dien vao o DANG TRONG: nguoi dung da go gi vao thi khong ghi de.
   */
  useEffect(() => {
    if (!user) return;
    setCustomerName((current) => current || profileName);
    setPhone((current) => current || user.phone || "");
    setAddress((current) => current || user.address || "");
    setCity((current) => current || user.city || user.areaLabel || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Tuy chon thanh toan. Hong thi van dat hang duoc, chi mat phan them.
  useEffect(() => {
    const controller = new AbortController();
    api
      .getOrderOptions(controller.signal)
      .then(setOptions)
      .catch(() => setOptions(null));
    // Hong thi van con COD
    api
      .listPaymentMethods(controller.signal)
      .then(setPaymentMethods)
      .catch(() => setPaymentMethods([]));
    return () => controller.abort();
  }, []);

  const ghnEnabled = options?.ghnEnabled ?? false;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const allowedProvinces = options?.deliveryProvinceIds ?? [];
  const areaLabel = options?.deliveryAreaLabel ?? "";

  // ---------- danh muc dia gioi GHN: tinh -> quan -> phuong (chi trong vung giao) ----------
  const ghn = useGhnAddress(ghnEnabled, allowedProvinces);
  const { provinceId, districtId, wardCode } = ghn;

  // Dien san khu vuc tu So dia chi. Chi khi khach chua tu chon gi — khong ghi de; dia chi
  // mac dinh o tinh studio khong giao thi bo qua, khach chon lai trong vung giao.
  const savedInArea =
    user?.provinceId != null && (allowedProvinces.length === 0 || allowedProvinces.includes(user.provinceId));
  useEffect(() => {
    if (!ghnEnabled || !user?.wardCode || !savedInArea || ghn.provinceId != null) return;
    ghn.prefill({ provinceId: user.provinceId, districtId: user.districtId, wardCode: user.wardCode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghnEnabled, user, savedInArea]);

  // Phi GHN: hoi lai moi khi doi phuong hoac doi so bo hoa (can nang doi)
  useEffect(() => {
    setGhnFee(null);
    setQuoteError(null);
    if (!ghnEnabled || districtId == null || !wardCode || itemCount === 0) return;
    const controller = new AbortController();
    setQuoting(true);
    const timer = window.setTimeout(() => {
      api
        .quoteShipping(districtId, wardCode, itemCount, controller.signal)
        .then((quote) => setGhnFee(quote.fee))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setQuoteError(error instanceof Error ? error.message : "Không tính được phí giao hàng.");
        })
        .finally(() => setQuoting(false));
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [ghnEnabled, districtId, wardCode, itemCount]);

  /**
   * Bat / tat "tang nguoi khac".
   * Bat: ho so cua minh chuyen sang o NGUOI TANG, o nguoi nhan de trong cho nguoi kia.
   * Tat: tra lai nhu cu.
   */
  function toggleGift(next: boolean) {
    setIsGift(next);
    if (next) {
      setSenderName((current) => current || profileName);
      setSenderPhone((current) => current || user?.phone || "");
      if (customerName === profileName) setCustomerName("");
      if (phone === (user?.phone ?? "")) setPhone("");
    } else {
      setCustomerName((current) => current || profileName);
      setPhone((current) => current || user?.phone || "");
    }
  }

  // "Hom nay" theo gio Viet Nam do server bao; chua tai xong thi tam dung dong ho may
  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  // Hoa cuoi / su kien / hoa theo yeu cau can dat truoc: lay muc lon nhat trong gio
  const leadDays = lines.reduce((max, line) => Math.max(max, line.leadDays ?? 0), 0);
  const minDate = options ? earliestDeliveryDate(options, leadDays) : today;

  // Ngay giao mac dinh = ngay som nhat co the; khach doi ngay thi giu lua chon cua khach
  useEffect(() => {
    setDeliveryDate((current) => (current && current >= minDate ? current : minDate));
  }, [minDate]);
  const threshold = options?.freeDeliveryThreshold ?? FREE_DELIVERY_THRESHOLD;
  // Co GHN: chua chon xong phuong thi chua biet phi (null)
  const baseFee: number | null = ghnEnabled ? ghnFee : (options?.deliveryFee ?? DELIVERY_FEE);

  // ---------- tien: xem truoc, cung cong thuc voi server ----------
  const cardPrice = options?.cards.find((c) => c.value === cardType)?.price ?? 0;
  const addonLines = useMemo(
    () =>
      (options?.addons ?? [])
        .filter((a) => (addons[a.value] ?? 0) > 0)
        .map((a) => ({ ...a, quantity: addons[a.value], lineTotal: round2(a.price * addons[a.value]) })),
    [options, addons],
  );
  const extras = round2(cardPrice + addonLines.reduce((sum, a) => sum + a.lineTotal, 0));
  const merchandise = round2(subtotal + extras);
  const discount = voucher ? Math.min(voucher.discount, merchandise) : 0;
  const afterDiscount = round2(merchandise - discount);
  const deliveryFee: number | null = afterDiscount >= threshold ? 0 : baseFee;
  const total = round2(afterDiscount + (deliveryFee ?? 0));
  const selectedMethod = paymentMethods.find((m) => m.code === paymentMethod);
  const payOnline = paymentMethod !== "COD";

  // Gia tri don doi (them qua, doi so luong) -> hoi lai server so tien giam cua ma dang ap
  const appliedCode = voucher?.code ?? null;
  useEffect(() => {
    if (!appliedCode) return;
    const timer = window.setTimeout(() => {
      api
        .checkVoucher(appliedCode, merchandise)
        .then((result) => {
          setVoucher(result);
          setVoucherError(null);
        })
        .catch((error: unknown) => {
          setVoucher(null);
          setVoucherError(error instanceof Error ? error.message : "Mã không còn áp dụng được.");
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [appliedCode, merchandise]);

  // Vi ma: hoi lai khi gia tri don doi, de popup biet ma nao dung duoc / giam bao nhieu
  const userId = user?.id;
  useEffect(() => {
    if (userId == null) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .listMyVouchers(merchandise, controller.signal)
        .then(setWallet)
        .catch(() => {
          if (!controller.signal.aborted) setWallet([]);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [userId, merchandise]);
  const usableVouchers = (wallet ?? []).filter((v) => v.status === "USABLE");
  const bestDiscount = usableVouchers.reduce((best, v) => Math.max(best, v.discount), 0);

  /** Ap ma (tu popup). Tra ve null khi ap duoc, hoac loi server de popup hien. Ma dang ap giu nguyen neu loi. */
  async function applyVoucher(code: string): Promise<string | null> {
    try {
      const result = await api.checkVoucher(code, merchandise);
      setVoucher(result);
      setVoucherError(null);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Không áp dụng được mã.";
    }
  }

  function removeVoucher() {
    setVoucher(null);
    setVoucherError(null);
  }

  /**
   * Khung giao da qua (giao hom nay) thi khoa lai, khong de khach chon roi moi bao loi.
   * Gio "bay gio" lay tu server (gio Viet Nam), may khach lech gio van dung.
   */
  function hourDisabled(hour: number): boolean {
    const isToday = !deliveryDate || deliveryDate === today;
    if (!isToday) return false;
    const [h, m] = (options?.nowTime ?? `${new Date().getHours()}:${new Date().getMinutes()}`).split(":").map(Number);
    const prep = options?.prepHours ?? PREP_HOURS;
    return h * 60 + m + prep * 60 > hour * 60;
  }

  // Doi ngay giao -> bo chon khung gio neu khung do khong con kip
  useEffect(() => {
    if (deliveryHour != null && hourDisabled(deliveryHour)) setDeliveryHour(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryDate, options]);

  /** Ghep hai o dia chi thanh mot chuoi duy nhat cho API. */
  function fullAddress(): string {
    return [address.trim(), city.trim()].filter(Boolean).join(", ");
  }

  function setAddonQuantity(code: string, quantity: number) {
    setAddons((current) => ({ ...current, [code]: Math.max(0, Math.min(10, quantity)) }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!customerName.trim()) next.customerName = "Nhập tên người nhận.";
    else if (customerName.trim().length < 2) next.customerName = "Tên người nhận cần ít nhất 2 ký tự.";

    if (!phone.trim()) next.phone = "Nhập số điện thoại người nhận.";
    else if (phone.trim().length < 8) next.phone = "Số điện thoại cần ít nhất 8 ký tự.";

    if (isGift && !senderName.trim()) next.senderName = "Nhập tên người tặng.";

    if (ghnEnabled) {
      if (!VN_PHONE.test(phone.replace(/\D/g, "")) && !next.phone) {
        next.phone = "Số di động Việt Nam 10 chữ số, ví dụ 0901 234 567.";
      }
      if (provinceId == null) next.provinceId = "Chọn tỉnh/thành phố.";
      if (districtId == null) next.districtId = "Chọn quận/huyện.";
      if (!wardCode) next.wardCode = "Chọn phường/xã.";
      if (!address.trim()) next.address = "Nhập số nhà, tên đường.";
      else if (address.trim().length < 3) next.address = "Địa chỉ cần ít nhất 3 ký tự.";
    } else if (!address.trim()) next.address = "Nhập địa chỉ giao hàng.";
    else if (fullAddress().length < 5) next.address = "Địa chỉ cần ít nhất 5 ký tự.";
    else if (fullAddress().length > 255) next.address = "Địa chỉ quá dài (tối đa 255 ký tự).";

    if (!deliveryDate) next.deliveryDate = "Chọn ngày giao hoa.";
    else if (deliveryDate < minDate) {
      next.deliveryDate =
        leadDays > 0
          ? `Có hoa cần đặt trước ${leadDays} ngày — giao sớm nhất ${options ? describeDay(options, minDate) : minDate}.`
          : `Đã qua giờ chốt đơn trong ngày — giao sớm nhất ${options ? describeDay(options, minDate) : minDate}.`;
    }

    if (ghnEnabled && provinceId != null && allowedProvinces.length > 0 && !allowedProvinces.includes(provinceId)) {
      next.provinceId = `Studio chỉ giao hoa tươi trong ${areaLabel}.`;
    }

    if (cardType !== "NONE" && cardMessage.trim().length > 200) {
      next.cardMessage = "Lời chúc tối đa 200 ký tự.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Chi gui ma + so luong. Gia, qua, giam gia va tong tien do backend tinh lai.
      const order = await api.createOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        // Co GHN: chi so nha + duong, server ghep ten phuong/quan/tinh tu ma GHN
        address: ghnEnabled ? address.trim() : fullAddress(),
        provinceId: ghnEnabled ? provinceId : null,
        districtId: ghnEnabled ? districtId : null,
        wardCode: ghnEnabled ? wardCode : null,
        paymentMethod,
        note: note.trim() || null,
        deliveryDate: deliveryDate || null,
        // Bo hoa: ma + co + so luong; hoa theo yeu cau: ma yeu cau. Gia do server tu lay.
        items: lines.map((line) =>
          line.customRequestId != null
            ? { customRequestId: line.customRequestId, quantity: 1 }
            : { productId: line.productId ?? undefined, size: line.size ?? undefined, quantity: line.quantity },
        ),
        senderName: isGift ? senderName.trim() : null,
        senderPhone: isGift ? senderPhone.trim() || null : null,
        anonymousSender: isGift && anonymousSender,
        cardType,
        cardMessage: cardType === "NONE" ? null : cardMessage.trim() || null,
        // Buoi giao do server tu suy ra tu khung gio, khong gui kem
        timeSlot: null,
        deliveryHour,
        addons: addonLines.map((a) => ({ code: a.value, quantity: a.quantity })),
        voucherCode: voucher?.code ?? null,
      });
      // Don da ton tai tu day - xoa gio du buoc thanh toan sau co that bai
      setLeaving(order.id);
      clear();
      if (payOnline) {
        try {
          const payment = await api.createPayment(order.id, paymentMethod as OnlineProvider);
          if (payment.payUrl) {
            // Roi SPA sang trang cua cong thanh toan; cong dua khach ve /payment/result
            window.location.assign(payment.payUrl);
            return;
          }
        } catch (error) {
          navigate(`/orders/${order.id}`, {
            replace: true,
            state: {
              justPlaced: true,
              paymentError: error instanceof Error ? error.message : "Không mở được cổng thanh toán.",
            },
          });
          return;
        }
      }
      // justPlaced: bao cho trang don biet day la khoanh khac VUA DAT XONG
      navigate(`/orders/${order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (error) {
      // That bai -> GIU NGUYEN gio hang de khach thu lai
      if (error instanceof NetworkError) setFormError(error.message);
      else if (error instanceof ApiError) {
        if (error.fieldErrors) setErrors((previous) => ({ ...previous, ...error.fieldErrors }));
        setFormError(error.message);
      } else setFormError("Không đặt được hàng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (leaving != null) {
    return (
      <div className="shell page-pad">
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center border border-dashed border-border px-6 py-16 text-center"
        >
          <Loader2 className="size-6 animate-spin text-accent" aria-hidden="true" />
          <h3 className="display-lg mt-5 text-foreground">
            {payOnline ? `Đang chuyển sang ${selectedMethod?.label ?? "cổng thanh toán"}…` : "Đang mở đơn của bạn…"}
          </h3>
          <p className="mt-3 max-w-md text-sm font-light text-muted-foreground">
            Studio đã nhận đơn. Vui lòng không đóng trang trong giây lát.
          </p>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="shell page-pad">
        <EmptyState
          title="Chưa có bó hoa nào để đặt"
          description="Giỏ hoa của bạn đang trống. Chọn một bó rồi quay lại đây nhé."
          action={
            <Button variant="primary" size="lg" asChild>
              <Link to="/products">Xem danh mục hoa →</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="shell page-pad">
      <header>
        <p className="label-micro text-accent">Người nhận · ngày giao · lời chúc</p>
        <h1 className="display-section mt-5 text-foreground">Đặt hoa</h1>
        <span aria-hidden="true" className="mt-6 block h-px w-28 bg-accent" />
        <CheckoutSteps current={1} />
      </header>

      <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[1fr_22rem]">
        {/* ---------- Bieu mau ---------- */}
        <section aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="sr-only">
            Thông tin giao hàng
          </h2>

          {user?.hasDefaultAddress ? (
            <p className="mt-5 max-w-xl text-xs font-light leading-relaxed text-muted-foreground">
              Đã điền sẵn từ địa chỉ mặc định của bạn. Sửa ở đây chỉ áp dụng cho đơn này —
              muốn đổi hẳn thì vào{" "}
              <Link
                to="/tai-khoan/dia-chi"
                className="text-accent transition-colors hover:text-accent-strong"
              >
                Sổ địa chỉ
              </Link>
              .
            </p>
          ) : null}

          <form id="checkout-form" onSubmit={handleSubmit} noValidate className="mt-7 max-w-xl space-y-6">
            {formError ? <Notice tone="error">{formError}</Notice> : null}

            <FormSection step="01" title="Người nhận hoa" />

            {/* Tang nguoi khac: phan lon don hoa la qua tang */}
            <label className="flex cursor-pointer items-start gap-3 bg-surface p-4">
              <input
                type="checkbox"
                checked={isGift}
                onChange={(event) => toggleGift(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--color-accent)]"
              />
              <span>
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Gift className="size-4 text-accent" aria-hidden="true" />
                  Tôi đặt hoa tặng người khác
                </span>
                <span className="mt-1 block text-xs font-light text-muted-foreground">
                  Nhập thông tin người nhận bên dưới. Thông tin của bạn dùng để shop liên hệ khi cần.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field id="customerName" label="Người nhận" error={errors.customerName} required>
                {(props) => (
                  <Input
                    {...props}
                    autoComplete={isGift ? "off" : "name"}
                    maxLength={100}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                )}
              </Field>

              <Field id="phone" label="Số điện thoại người nhận" error={errors.phone} required>
                {(props) => (
                  <Input
                    {...props}
                    type="tel"
                    autoComplete={isGift ? "off" : "tel"}
                    maxLength={20}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0900 123 456"
                  />
                )}
              </Field>
            </div>

            {isGift ? (
              <div className="space-y-5 border-l border-accent/40 pl-5">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Field id="senderName" label="Người tặng (bạn)" error={errors.senderName} required>
                    {(props) => (
                      <Input
                        {...props}
                        autoComplete="name"
                        maxLength={100}
                        value={senderName}
                        onChange={(event) => setSenderName(event.target.value)}
                      />
                    )}
                  </Field>
                  <Field id="senderPhone" label="Số điện thoại của bạn" error={errors.senderPhone}>
                    {(props) => (
                      <Input
                        {...props}
                        type="tel"
                        autoComplete="tel"
                        maxLength={20}
                        value={senderPhone}
                        onChange={(event) => setSenderPhone(event.target.value)}
                      />
                    )}
                  </Field>
                </div>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-light text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={anonymousSender}
                    onChange={(event) => setAnonymousSender(event.target.checked)}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  Giấu tên người tặng (không ghi tên trên thiệp, shipper không tiết lộ)
                </label>
              </div>
            ) : null}

            <FormSection step="02" title="Giao đến đâu" />

            {ghnEnabled ? (
              <div className="space-y-6">
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
                      autoComplete={isGift ? "off" : "address-line1"}
                      maxLength={150}
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="12 Nguyễn Huệ"
                    />
                  )}
                </Field>
                <p className="flex items-start gap-2.5 text-xs font-light leading-relaxed text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>
                    {areaLabel
                      ? `Studio giao hoa tươi trong nội thành ${areaLabel} để hoa tới tay người nhận ngay trong ngày. `
                      : ""}
                    Shipper Giao Hàng Nhanh (GHN) nhận hoa tại studio; phí tính theo phường/xã và số bó
                    {quoting ? " — đang tính…" : ghnFee != null ? `: ${formatPrice(ghnFee)}.` : "."}
                    {quoteError ? <span className="block text-danger">{quoteError}</span> : null}
                  </span>
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1.6fr_1fr]">
              <Field id="address" label="Địa chỉ giao hàng" error={errors.address} required>
                {(props) => (
                  <Input
                    {...props}
                    autoComplete={isGift ? "off" : "street-address"}
                    maxLength={180}
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
                    autoComplete={isGift ? "off" : "address-level2"}
                    maxLength={60}
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Hà Nội"
                  />
                )}
              </Field>
            </div>
            )}

            <FormSection step="03" title="Thời gian giao" />

            <Field
              id="deliveryDate"
              label="Ngày giao"
              error={errors.deliveryDate}
              required
              hint={
                !options
                  ? undefined
                  : leadDays > 0
                    ? `Giỏ có hoa cần đặt trước ${leadDays} ngày — sớm nhất ${describeDay(options, minDate)}.`
                    : options.sameDayOpen
                      ? `Đặt trước ${options.sameDayCutoffHour}:00 thì giao được ngay hôm nay.`
                      : `Đã qua ${options.sameDayCutoffHour}:00, đơn hôm nay đã chốt — sớm nhất ngày mai.`
              }
            >
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  min={minDate}
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  className="sm:max-w-xs"
                />
              )}
            </Field>

            {options ? (
              <fieldset>
                <legend className="label-micro mb-3 text-muted-foreground">Giờ giao</legend>

                {/* Mac dinh: shipper giao luc thuan tien trong ngay */}
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 border px-4 py-3 text-sm transition-colors",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    deliveryHour == null
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="deliveryHour"
                    checked={deliveryHour == null}
                    onChange={() => setDeliveryHour(null)}
                    className="sr-only"
                  />
                  <span>Lúc nào cũng được</span>
                  <span className="text-xs text-muted-foreground">
                    {options.firstDeliveryHour ?? 8}:00 – {(options.lastDeliveryHour ?? 20) + 1}:00
                  </span>
                </label>

                <div className="mt-4 space-y-3">
                  {DAY_PARTS.map((part) => {
                    const hours = Array.from({ length: part.to - part.from }, (_, i) => part.from + i);
                    if (hours.every(hourDisabled)) {
                      return (
                        <div key={part.label} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
                          <span className="label-micro text-muted-foreground/60">{part.label}</span>
                          <span className="text-xs text-muted-foreground/60">Hôm nay đã qua</span>
                        </div>
                      );
                    }
                    return (
                      <div key={part.label} className="grid grid-cols-[3.5rem_1fr] items-start gap-3">
                        <span className="label-micro pt-2.5 text-muted-foreground">{part.label}</span>
                        {/* 5 cot: buoi Chieu co 5 khung, moi buoi nam gon tren mot hang */}
                        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                          {hours.map((hour) => {
                            const disabled = hourDisabled(hour);
                            const active = deliveryHour === hour;
                            return (
                              <label
                                key={hour}
                                className={cn(
                                  "num cursor-pointer whitespace-nowrap border px-1 py-2 text-center text-xs transition-colors",
                                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                                  disabled && "cursor-not-allowed border-border/50 text-muted-foreground/35 line-through",
                                  !disabled && active && "border-accent bg-accent text-background",
                                  !disabled && !active && "border-border text-foreground hover:border-accent/60",
                                )}
                              >
                                <input
                                  type="radio"
                                  name="deliveryHour"
                                  value={hour}
                                  checked={active}
                                  disabled={disabled}
                                  onChange={() => setDeliveryHour(hour)}
                                  className="sr-only"
                                />
                                {hour}:00–{hour + 1}:00
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-xs font-light leading-relaxed text-muted-foreground">
                  {deliveryHour != null ? (
                    <>
                      Người nhận sẽ nhận hoa trong khoảng{" "}
                      <span className="num text-accent">
                        {deliveryHour}:00 – {deliveryHour + 1}:00
                      </span>
                      {deliveryDate ? `, ngày ${deliveryDate.slice(8, 10)}/${deliveryDate.slice(5, 7)}` : ""}. Shipper
                      gọi người nhận trước khi tới.
                    </>
                  ) : (
                    <>Shipper giao trong ngày và gọi người nhận trước khi tới. Cần đúng giờ thì chọn một khung ở trên.</>
                  )}
                </p>
              </fieldset>
            ) : null}

            {options ? (
              <>
                <FormSection step="04" title="Thiệp & quà kèm" />

                <fieldset>
                  <legend className="label-micro mb-3 text-muted-foreground">Thiệp</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {options.cards.map((card) => {
                      const active = cardType === card.value;
                      return (
                        <label
                          key={card.value}
                          className={cn(
                            "cursor-pointer border px-4 py-3 text-sm transition-colors",
                            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                            active
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-border-strong",
                          )}
                        >
                          <input
                            type="radio"
                            name="cardType"
                            value={card.value}
                            checked={active}
                            onChange={() => setCardType(card.value)}
                            className="sr-only"
                          />
                          {card.label}
                          <span className="num mt-0.5 block text-xs text-muted-foreground">
                            {card.price === 0 ? "Miễn phí" : `+${formatPrice(card.price)}`}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {cardType !== "NONE" ? (
                  <Field
                    id="cardMessage"
                    label="Lời chúc in trên thiệp"
                    error={errors.cardMessage}
                    hint={`${cardMessage.length}/200 ký tự${isGift && anonymousSender ? " · thiệp sẽ không ghi tên người tặng" : ""}`}
                  >
                    {(props) => (
                      <Textarea
                        {...props}
                        maxLength={200}
                        value={cardMessage}
                        onChange={(event) => setCardMessage(event.target.value)}
                        placeholder="Chúc mừng sinh nhật! Mong mọi điều tốt đẹp nhất đến với bạn."
                      />
                    )}
                  </Field>
                ) : null}

                <fieldset>
                  <legend className="label-micro mb-3 text-muted-foreground">Quà kèm</legend>
                  <ul className="divide-y divide-border border-y border-border">
                    {options.addons.map((addon) => {
                      const quantity = addons[addon.value] ?? 0;
                      return (
                        <li key={addon.value} className="flex items-center gap-4 py-3.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground">{addon.label}</p>
                            {addon.description ? (
                              <p className="text-xs font-light text-muted-foreground">
                                {addon.description}
                              </p>
                            ) : null}
                          </div>
                          <p className="num w-14 shrink-0 text-right text-sm text-muted-foreground">
                            {formatPrice(addon.price)}
                          </p>
                          <div className="flex shrink-0 items-center border border-border">
                            <button
                              type="button"
                              onClick={() => setAddonQuantity(addon.value, quantity - 1)}
                              disabled={quantity === 0}
                              className="inline-flex size-9 items-center justify-center text-muted-foreground hover:text-accent disabled:opacity-25"
                            >
                              <Minus className="size-3.5" aria-hidden="true" />
                              <span className="sr-only">Bớt {addon.label}</span>
                            </button>
                            <span className="num w-7 text-center text-sm text-foreground" aria-live="polite">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAddonQuantity(addon.value, quantity + 1)}
                              disabled={quantity >= 10}
                              className="inline-flex size-9 items-center justify-center text-muted-foreground hover:text-accent disabled:opacity-25"
                            >
                              <Plus className="size-3.5" aria-hidden="true" />
                              <span className="sr-only">Thêm {addon.label}</span>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              </>
            ) : null}

            <FormSection step={options ? "05" : "04"} title="Ghi chú cho người giao" />

            <Field id="note" label="Ghi chú" error={errors.note}>
              {(props) => (
                <Textarea
                  {...props}
                  maxLength={500}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Gọi trước khi giao, gửi bảo vệ toà nhà…"
                />
              )}
            </Field>

            <FormSection step={options ? "06" : "05"} title="Thanh toán" />

            <fieldset>
              <legend className="sr-only">Phương thức thanh toán</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(paymentMethods.length
                  ? paymentMethods
                  : [{ code: "COD", label: "Thanh toán khi nhận hàng", description: "Trả tiền mặt cho nhân viên giao hàng", online: false }]
                ).map((method) => {
                  const active = paymentMethod === method.code;
                  const Icon = method.online ? CreditCard : Wallet;
                  return (
                    <label
                      key={method.code}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 border px-4 py-3.5 text-sm transition-colors",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                        active
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.code}
                        checked={active}
                        onChange={() => setPaymentMethod(method.code as PaymentMethodCode)}
                        className="sr-only"
                      />
                      <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                      <span>
                        <span className="block text-foreground">{method.label}</span>
                        <span className="mt-0.5 block text-xs font-light">{method.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-xs font-light leading-relaxed text-muted-foreground">
                {payOnline
                  ? `Bấm đặt hàng sẽ chuyển sang trang ${selectedMethod?.label ?? "cổng thanh toán"} để trả tiền. Studio không lưu thông tin thẻ. Đơn chưa thanh toán sau 30 phút sẽ tự huỷ.`
                  : "Trả tiền mặt khi nhận hoa. Studio không thu tiền trước."}
              </p>
            </fieldset>

            <Link
              to="/cart"
              className="label-micro inline-block text-muted-foreground transition-colors hover:text-accent"
            >
              ← Quay lại giỏ hàng
            </Link>
          </form>
        </section>

        {/* ---------- Tom tat don ---------- */}
        <aside aria-labelledby="order-summary-heading" className="lg:sticky lg:top-28 lg:self-start">
          <div className="bg-surface p-7">
            <h2 id="order-summary-heading" className="label-micro text-accent">
              Đơn của bạn
            </h2>

            <ul className="mt-6 space-y-4">
              {lines.map((line) => (
                <li key={line.key} className="flex items-center gap-4">
                  <img
                    src={resolveImageUrl(line.imageUrl)}
                    alt=""
                    onError={(event) => {
                      const img = event.currentTarget;
                      if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                    }}
                    className="size-14 shrink-0 bg-surface-raised object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{line.name}</p>
                    {line.sizeLabel ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {line.customRequestId != null ? line.sizeLabel : `Cỡ ${line.sizeLabel}`}
                      </p>
                    ) : null}
                    <p className="num text-xs text-muted-foreground">
                      {formatPrice(line.price)} × {line.quantity}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm text-foreground">
                    {formatPrice(line.price * line.quantity)}
                  </p>
                </li>
              ))}
            </ul>

            {/* ---------- Ma giam gia: mot hang, bam vao mo popup chon ma ---------- */}
            <div className="mt-7 border-t border-border-strong/40 pt-6">
              <p className="label-micro flex items-center gap-2 text-muted-foreground">
                <TicketPercent className="size-3.5 text-accent" aria-hidden="true" />
                Mã giảm giá
              </p>

              {!user ? (
                <p className="mt-3 text-xs font-light text-muted-foreground">
                  <Link to="/login" className="text-accent hover:text-accent-strong">
                    Đăng nhập
                  </Link>{" "}
                  để dùng mã giảm giá.
                </p>
              ) : (
                <div
                  className={cn(
                    "mt-3 flex items-stretch border transition-colors",
                    voucher ? "border-accent/60 bg-accent/10" : "border-dashed border-border-strong hover:border-accent",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    aria-haspopup="dialog"
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    {voucher ? (
                      <>
                        <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="num block text-sm tracking-wider text-foreground">{voucher.code}</span>
                          <span className="num block truncate text-xs font-light text-success">
                            Giảm {formatPrice(discount)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-accent">Đổi</span>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-foreground">Chọn hoặc nhập mã</span>
                          <span className="block truncate text-xs font-light text-muted-foreground">
                            {usableVouchers.length > 0
                              ? `Có ${usableVouchers.length} mã dùng được, giảm tới ${formatPrice(bestDiscount)}`
                              : "Mã studio tặng riêng bạn cũng nằm ở đây"}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </>
                    )}
                  </button>
                  {voucher ? (
                    <button
                      type="button"
                      onClick={removeVoucher}
                      className="inline-flex w-10 shrink-0 items-center justify-center border-l border-accent/30 text-muted-foreground hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    >
                      <X className="size-4" aria-hidden="true" />
                      <span className="sr-only">Bỏ mã {voucher.code}</span>
                    </button>
                  ) : null}
                </div>
              )}
              {voucherError ? (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {voucherError}
                </p>
              ) : null}
            </div>

            <dl className="mt-6 space-y-3.5 border-t border-border-strong/40 pt-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tiền hoa</dt>
                <dd className="num text-foreground">{formatPrice(subtotal)}</dd>
              </div>
              {extras > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Thiệp & quà kèm</dt>
                  <dd className="num text-foreground">{formatPrice(extras)}</dd>
                </div>
              ) : null}
              {discount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Giảm giá ({voucher?.code})</dt>
                  <dd className="num text-success">−{formatPrice(discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Phí giao hàng</dt>
                <dd className="num text-right text-foreground">
                  {deliveryFee === 0
                    ? "Miễn phí"
                    : deliveryFee == null
                      ? quoting
                        ? "Đang tính…"
                        : "Chọn địa chỉ"
                      : formatPrice(deliveryFee)}
                </dd>
              </div>
            </dl>

            {deliveryFee !== 0 ? (
              <p className="mt-3 text-xs font-light text-muted-foreground">
                Thêm {formatPrice(round2(threshold - afterDiscount))} để được miễn phí giao hàng.
              </p>
            ) : null}

            <div className="mt-6 flex items-baseline justify-between border-t border-border-strong/40 pt-5">
              <span className="label-micro text-muted-foreground">Tổng cộng</span>
              <span className="num font-display text-3xl font-semibold italic text-accent">
                {formatPrice(total)}
              </span>
            </div>

            <Button
              type="submit"
              form="checkout-form"
              variant="primary"
              size="lg"
              className="mt-7 w-full"
              // Co GHN ma chua co phi thi chua cho dat: khach phai thay tong tien that truoc
              disabled={submitting || (ghnEnabled && deliveryFee == null && provinceId != null && wardCode !== "")}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  {payOnline ? "Đang mở cổng thanh toán…" : "Đang gửi đơn…"}
                </>
              ) : payOnline ? (
                `Đặt hoa & thanh toán · ${formatPrice(total)} →`
              ) : (
                `Đặt hoa · ${formatPrice(total)} →`
              )}
            </Button>

            <p className="mt-5 text-xs font-light leading-relaxed text-muted-foreground">
              Tổng tiền cuối cùng được máy chủ tính lại theo giá trong cơ sở dữ liệu tại thời điểm đặt
              hàng.
            </p>
          </div>
        </aside>
      </div>

      {user ? (
        <VoucherPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          vouchers={wallet}
          amount={merchandise}
          appliedCode={voucher?.code ?? null}
          onApply={applyVoucher}
          onRemove={removeVoucher}
        />
      ) : null}
    </div>
  );
}

/**
 * Tieu de mot nhom truong trong form thanh toan.
 * Chia thanh nhom co danh so thi nguoi dien biet minh dang o dau va con bao nhieu buoc.
 */
function FormSection({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-border pb-4 pt-2 first:pt-0">
      <span className="num label-micro text-accent">{step}</span>
      <h3 className="label-micro text-muted-foreground">{title}</h3>
    </div>
  );
}
