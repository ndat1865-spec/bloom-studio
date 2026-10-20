import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode, Ref } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Amphora,
  Award,
  Cake,
  Check,
  Feather,
  Flower2,
  Gem,
  Gift,
  HandHeart,
  Heart,
  ImagePlus,
  PartyPopper,
  ShoppingBasket,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { ApiError, NetworkError, api, type OrderOptions, type ProductAttributes } from "@/lib/api";
import { addDays } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================
   Danh muc lua chon. Gui len server bang NHAN tieng Viet: thu hoa doc thang, khong
   phai tra bang ma. Doi / them lua chon chi sua o day.
   ============================================================ */

/** Dip tang du phong khi chua tai duoc danh muc tu product-service. */
const FALLBACK_OCCASIONS = [
  { value: "BIRTHDAY", label: "Sinh nhật" },
  { value: "LOVE", label: "Tình yêu" },
  { value: "OPENING", label: "Khai trương" },
  { value: "WEDDING", label: "Cưới hỏi" },
  { value: "SYMPATHY", label: "Chia buồn" },
  { value: "THANKS", label: "Cảm ơn" },
  { value: "CONGRATS", label: "Chúc mừng" },
];

const OCCASION_ICON: Record<string, LucideIcon> = {
  BIRTHDAY: Cake,
  LOVE: Heart,
  OPENING: Store,
  WEDDING: Gem,
  SYMPATHY: Feather,
  THANKS: HandHeart,
  CONGRATS: Award,
};

type Arrangement = {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Dip hop voi kieu nay - hien nhan "Hop dip nay". */
  fits: string[];
  /** Co giay goi hay khong (bo tay, hoa cuoi). */
  wrapped?: boolean;
};

const ARRANGEMENTS: Arrangement[] = [
  { id: "BO", label: "Bó hoa", hint: "Gói giấy, trao tận tay", icon: Flower2, fits: ["BIRTHDAY", "LOVE", "THANKS", "CONGRATS"], wrapped: true },
  { id: "HOP", label: "Hộp hoa", hint: "Hộp tròn / vuông, gọn và sang", icon: Gift, fits: ["BIRTHDAY", "LOVE"] },
  { id: "GIO", label: "Giỏ hoa", hint: "Đặt bàn, trang trọng", icon: ShoppingBasket, fits: ["BIRTHDAY", "THANKS", "OPENING", "SYMPATHY"] },
  { id: "BINH", label: "Bình hoa", hint: "Cắm sẵn trong bình, để được lâu", icon: Amphora, fits: ["THANKS", "CONGRATS"] },
  { id: "KE", label: "Kệ hoa", hint: "Khai trương, chúc mừng, chia buồn", icon: PartyPopper, fits: ["OPENING", "CONGRATS", "SYMPATHY"] },
  { id: "CUOI", label: "Hoa cưới cầm tay", hint: "Cho cô dâu, kèm hoa cài áo", icon: Sparkles, fits: ["WEDDING"], wrapped: true },
];

type SizeOption = { id: string; label: string; detail: string; from: number };

/** Co thuong va co ke hoa (tinh theo tang) — gia "tu" de goi y ngan sach. */
const SIZES: SizeOption[] = [
  { id: "S", label: "Nhỏ xinh", detail: "khoảng 10 cành", from: 300_000 },
  { id: "M", label: "Vừa", detail: "khoảng 20 cành", from: 550_000 },
  { id: "L", label: "Lớn", detail: "khoảng 35 cành", from: 900_000 },
  { id: "XL", label: "Rất lớn", detail: "50 cành trở lên", from: 1_500_000 },
];
const STAND_SIZES: SizeOption[] = [
  { id: "K1", label: "Kệ 1 tầng", detail: "cao khoảng 1,2 m", from: 800_000 },
  { id: "K2", label: "Kệ 2 tầng", detail: "cao khoảng 1,6 m", from: 1_500_000 },
  { id: "K3", label: "Kệ 3 tầng", detail: "cao khoảng 1,8 m", from: 2_500_000 },
];

const FLOWERS = [
  "Hồng",
  "Tulip",
  "Cẩm tú cầu",
  "Mẫu đơn",
  "Hướng dương",
  "Lan hồ điệp",
  "Cát tường",
  "Cúc hoạ mi",
  "Baby",
  "Thược dược",
  "Đồng tiền",
  "Cẩm chướng",
];
const FLORIST_PICKS = "Để thợ hoa chọn";
const MAX_FLOWERS = 4;

/** Mau hien tren o mau; MIXED la vong nhieu mau. */
const SWATCH: Record<string, string> = {
  RED: "#b3261e",
  PINK: "#e8a0b4",
  WHITE: "#f3eee4",
  YELLOW: "#e5a93c",
  PURPLE: "#8e6bb0",
  GREEN: "#7fa36b",
  MIXED: "conic-gradient(#b3261e, #e5a93c, #7fa36b, #8e6bb0, #e8a0b4, #b3261e)",
};
const FALLBACK_COLORS = [
  { value: "RED", label: "Đỏ" },
  { value: "PINK", label: "Hồng" },
  { value: "WHITE", label: "Trắng" },
  { value: "YELLOW", label: "Vàng / cam" },
  { value: "PURPLE", label: "Tím" },
  { value: "GREEN", label: "Xanh lá" },
  { value: "MIXED", label: "Nhiều màu" },
];
const MAX_COLORS = 3;

const STYLES = ["Lãng mạn", "Sang trọng", "Tối giản", "Rực rỡ", "Đồng nội", "Kiểu Hàn Quốc"];
const WRAPPINGS = ["Giấy kraft nâu", "Giấy Hàn Quốc", "Lưới voan", "Để studio chọn"];
const AVOIDS = ["Hoa mùi nồng", "Nhiều phấn hoa (dị ứng)", "Hoa ly", "Hoa cúc", "Toàn màu trắng"];

const BUDGETS = [300_000, 500_000, 800_000, 1_200_000, 2_000_000];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Errors = Partial<Record<"arrangement" | "budget" | "desiredDate" | "contactPhone" | "image" | "colors", string>>;

/**
 * Dat hoa theo yeu cau — khach chon tung phan cua bo hoa, studio bao gia.
 *
 * Buoc 1 (trang nay): dip, kieu, co, hoa, mau, phong cach, giay goi, dieu can tranh, ngan
 * sach (+ anh mau, ghi chu). Moi lua chon luu thanh truong rieng o order-service.
 * Buoc 2 (admin): studio bao gia.
 * Buoc 3 (Tai khoan > Yeu cau dat hoa): khach dong y -> bo hoa vao gio -> dat nhu don thuong.
 */
export default function CustomOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attributes, setAttributes] = useState<ProductAttributes | null>(null);
  const [options, setOptions] = useState<OrderOptions | null>(null);

  const [occasion, setOccasion] = useState<string | null>(null);
  const [arrangement, setArrangement] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [flowers, setFlowers] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [colorNote, setColorNote] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [wrapping, setWrapping] = useState<string | null>(null);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [budget, setBudget] = useState("500000");
  const [notes, setNotes] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const arrangementRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.getProductAttributes(controller.signal).then(setAttributes).catch(() => setAttributes(null));
    api.getOrderOptions(controller.signal).then(setOptions).catch(() => setOptions(null));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setContactPhone((current) => current || user?.phone || "");
  }, [user]);

  // Giai phong URL xem truoc khi doi anh / roi trang
  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const occasions = attributes?.occasions?.length ? attributes.occasions : FALLBACK_OCCASIONS;
  const colorOptions = attributes?.colors?.length ? attributes.colors : FALLBACK_COLORS;

  const chosenArrangement = ARRANGEMENTS.find((a) => a.id === arrangement) ?? null;
  const sizeOptions = arrangement === "KE" ? STAND_SIZES : SIZES;
  const chosenSize = sizeOptions.find((s) => s.id === size) ?? null;
  const occasionLabel = occasions.find((o) => o.value === occasion)?.label ?? null;
  const colorLabels = colors.map((c) => colorOptions.find((o) => o.value === c)?.label ?? c);
  const amount = Number(budget);

  // Bo lam rieng can it nhat mot ngay de studio nhap hoa
  const minDate = addDays(options?.today ?? new Date().toISOString().slice(0, 10), 1);

  function chooseArrangement(id: string) {
    setArrangement(id);
    setErrors((e) => ({ ...e, arrangement: undefined }));
    // Doi giua ke hoa va loai khac thi bang co khac nhau -> bo co da chon
    const nextSizes = id === "KE" ? STAND_SIZES : SIZES;
    if (size && !nextSizes.some((s) => s.id === size)) setSize(null);
    if (!ARRANGEMENTS.find((a) => a.id === id)?.wrapped) setWrapping(null);
  }

  function chooseSize(option: SizeOption) {
    setSize(option.id);
    // Ngan sach thap hon muc "tu" cua co nay thi nang len cho khop
    if (!Number.isFinite(amount) || amount < option.from) setBudget(String(option.from));
  }

  function toggleFlower(name: string) {
    if (name === FLORIST_PICKS) {
      setFlowers((current) => (current.includes(FLORIST_PICKS) ? [] : [FLORIST_PICKS]));
      return;
    }
    setFlowers((current) => {
      const rest = current.filter((f) => f !== FLORIST_PICKS);
      if (rest.includes(name)) return rest.filter((f) => f !== name);
      return rest.length >= MAX_FLOWERS ? rest : [...rest, name];
    });
  }

  function toggleColor(value: string) {
    setColors((current) =>
      current.includes(value)
        ? current.filter((c) => c !== value)
        : current.length >= MAX_COLORS
          ? current
          : [...current, value],
    );
  }

  function toggleAvoid(value: string) {
    setAvoid((current) => (current.includes(value) ? current.filter((a) => a !== value) : [...current, value]));
  }

  const colorsText = useMemo(() => {
    const text = [colorLabels.join(", "), colorNote.trim()].filter(Boolean).join(" — ");
    return text || null;
  }, [colorLabels, colorNote]);

  function validate(): boolean {
    const next: Errors = {};
    if (!arrangement) next.arrangement = "Chọn kiểu hoa bạn muốn.";
    if (!budget || !Number.isFinite(amount)) next.budget = "Cho studio biết ngân sách của bạn.";
    else if (amount < 200_000) next.budget = "Ngân sách tối thiểu 200.000đ.";
    else if (amount > 50_000_000) next.budget = "Đơn trên 50 triệu, bạn gọi thẳng cho studio nhé.";
    if (colorsText && colorsText.length > 100) next.colors = "Ghi chú màu hơi dài, rút gọn lại một chút.";
    if (desiredDate && desiredDate < minDate) next.desiredDate = "Hoa làm riêng cần ít nhất 1 ngày — chọn từ ngày mai.";
    if (contactPhone && contactPhone.replace(/\D/g, "").length < 9) next.contactPhone = "Số điện thoại chưa đúng.";
    if (image && image.size > MAX_IMAGE_BYTES) next.image = "Ảnh tối đa 5MB.";

    setErrors(next);
    if (next.arrangement) arrangementRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate() || !chosenArrangement) return;

    setSubmitting(true);
    try {
      const created = await api.createCustomRequest({
        occasion: occasionLabel,
        arrangement: chosenArrangement.label,
        sizeOption: chosenSize ? `${chosenSize.label} (${chosenSize.detail})` : null,
        flowers: flowers.length ? flowers.join(", ") : null,
        colors: colorsText,
        style,
        wrapping,
        avoid: avoid.length ? avoid.join(", ") : null,
        budget: amount,
        description: notes.trim() || null,
        desiredDate: desiredDate || null,
        contactPhone: contactPhone.trim() || null,
      });
      // Anh mau gui sau: yeu cau da luu roi, anh loi thi van khong mat yeu cau
      let imageError: string | null = null;
      if (image) {
        try {
          await api.uploadCustomRequestImage(created.id, image);
        } catch (error) {
          imageError = error instanceof Error ? error.message : "Không tải được ảnh mẫu.";
        }
      }
      navigate("/tai-khoan/yeu-cau-dat-hoa", { state: { justCreated: created.code, imageError } });
    } catch (error) {
      if (error instanceof NetworkError) setFormError(error.message);
      else if (error instanceof ApiError) {
        if (error.fieldErrors) setErrors((previous) => ({ ...previous, ...error.fieldErrors }));
        setFormError(error.message);
      } else setFormError("Không gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  const belowSize = chosenSize && Number.isFinite(amount) && amount < chosenSize.from;

  return (
    <div className="shell page-pad">
      <header className="max-w-2xl">
        <p className="label-micro text-accent">Đặt hoa theo yêu cầu</p>
        <h1 className="display-section mt-5 text-foreground">Cùng thợ hoa phác bó hoa của bạn</h1>
        <span aria-hidden="true" className="mt-6 block h-px w-28 bg-accent" />
        <p className="prose-measure mt-6 text-[1.0625rem] font-light leading-relaxed text-muted-foreground">
          Chọn kiểu, cỡ, loại hoa và tông màu — chỗ nào chưa chắc cứ để thợ hoa quyết. Studio báo giá theo
          đúng những gì bạn chọn, bạn đồng ý thì đặt như một bó bình thường.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[1fr_21rem]">
        <form id="custom-order-form" onSubmit={handleSubmit} noValidate className="min-w-0 max-w-2xl space-y-14">
          {formError ? <Notice tone="error">{formError}</Notice> : null}

          {/* ---------- 1. Dip & kieu hoa ---------- */}
          <section aria-labelledby="step-1" className="space-y-9">
            <StepHeading id="step-1" step="01" title="Dịp và kiểu hoa" />

            <ChoiceGroup legend="Tặng dịp gì?" hint="Không bắt buộc">
              <div className="flex flex-wrap gap-2">
                {occasions.map((o) => {
                  const Icon = OCCASION_ICON[o.value] ?? Flower2;
                  return (
                    <Chip key={o.value} selected={occasion === o.value} onClick={() => setOccasion(occasion === o.value ? null : o.value)}>
                      <Icon className="size-3.5" aria-hidden="true" />
                      {o.label}
                    </Chip>
                  );
                })}
              </div>
            </ChoiceGroup>

            <ChoiceGroup legend="Kiểu hoa" required error={errors.arrangement} fieldsetRef={arrangementRef}>
              <div role="radiogroup" aria-label="Kiểu hoa" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ARRANGEMENTS.map((a) => {
                  const selected = arrangement === a.id;
                  const fits = occasion != null && a.fits.includes(occasion);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseArrangement(a.id)}
                      className={cn(
                        "relative flex flex-col items-start gap-2 border p-4 text-left transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        selected
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface/60 hover:border-accent/60",
                      )}
                    >
                      <a.icon className={cn("size-5", selected ? "text-accent" : "text-muted-foreground")} aria-hidden="true" />
                      <span className="text-sm text-foreground">{a.label}</span>
                      <span className="text-xs font-light leading-snug text-muted-foreground">{a.hint}</span>
                      {fits ? (
                        <span className="absolute right-2.5 top-2.5 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                          Hợp dịp này
                        </span>
                      ) : null}
                      {selected ? (
                        <Check className="absolute bottom-3 right-3 size-4 text-accent" aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </ChoiceGroup>

            <ChoiceGroup legend={arrangement === "KE" ? "Cỡ kệ" : "Kích cỡ"} hint="Giá gợi ý để bạn ước ngân sách">
              <div
                role="radiogroup"
                aria-label="Kích cỡ"
                className={cn("grid gap-3", sizeOptions.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
                {sizeOptions.map((s) => {
                  const selected = size === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseSize(s)}
                      className={cn(
                        "flex flex-col items-start border px-4 py-3 text-left transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        selected ? "border-accent bg-accent/10" : "border-border bg-surface/60 hover:border-accent/60",
                      )}
                    >
                      <span className="text-sm text-foreground">{s.label}</span>
                      <span className="mt-0.5 text-xs font-light text-muted-foreground">{s.detail}</span>
                      <span className="num mt-2 text-xs text-accent">từ {formatPrice(s.from)}</span>
                    </button>
                  );
                })}
              </div>
            </ChoiceGroup>
          </section>

          {/* ---------- 2. Hoa & mau ---------- */}
          <section aria-labelledby="step-2" className="space-y-9">
            <StepHeading id="step-2" step="02" title="Hoa và màu sắc" />

            <ChoiceGroup legend="Hoa chính" hint={`Chọn tối đa ${MAX_FLOWERS} loại`}>
              <div className="flex flex-wrap gap-2">
                {FLOWERS.map((name) => {
                  const selected = flowers.includes(name);
                  const full = !selected && flowers.filter((f) => f !== FLORIST_PICKS).length >= MAX_FLOWERS;
                  return (
                    <Chip key={name} selected={selected} disabled={full} onClick={() => toggleFlower(name)}>
                      {name}
                    </Chip>
                  );
                })}
                <Chip selected={flowers.includes(FLORIST_PICKS)} onClick={() => toggleFlower(FLORIST_PICKS)} dashed>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {FLORIST_PICKS}
                </Chip>
              </div>
            </ChoiceGroup>

            <ChoiceGroup legend="Tông màu" hint={`Tối đa ${MAX_COLORS} màu`} error={errors.colors}>
              <div className="flex flex-wrap gap-x-4 gap-y-3">
                {colorOptions.map((c) => {
                  const selected = colors.includes(c.value);
                  const full = !selected && colors.length >= MAX_COLORS;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={selected}
                      disabled={full}
                      onClick={() => toggleColor(c.value)}
                      className={cn(
                        "group flex w-16 flex-col items-center gap-2 text-center disabled:opacity-40",
                        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative flex size-10 items-center justify-center rounded-full ring-1 ring-border-strong/60 transition-shadow",
                          selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : "group-hover:ring-accent/60",
                        )}
                        style={{ background: SWATCH[c.value] ?? "var(--color-surface-raised)" }}
                      >
                        {selected ? (
                          <Check
                            className={cn("size-4", c.value === "WHITE" || c.value === "PINK" ? "text-background" : "text-white")}
                            strokeWidth={3}
                          />
                        ) : null}
                      </span>
                      <span className={cn("text-[11px] leading-tight", selected ? "text-foreground" : "text-muted-foreground")}>
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <Input
                aria-label="Ghi chú thêm về màu"
                value={colorNote}
                maxLength={60}
                onChange={(event) => setColorNote(event.target.value)}
                placeholder="Ghi chú màu (tuỳ chọn): pastel nhạt, tránh vàng chanh…"
                className="mt-5"
              />
            </ChoiceGroup>

            <ChoiceGroup legend="Phong cách">
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <Chip key={s} selected={style === s} onClick={() => setStyle(style === s ? null : s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </ChoiceGroup>

            {chosenArrangement?.wrapped ? (
              <ChoiceGroup legend="Giấy gói">
                <div className="flex flex-wrap gap-2">
                  {WRAPPINGS.map((w) => (
                    <Chip key={w} selected={wrapping === w} onClick={() => setWrapping(wrapping === w ? null : w)}>
                      {w}
                    </Chip>
                  ))}
                </div>
              </ChoiceGroup>
            ) : null}

            <ChoiceGroup legend="Cần tránh" hint="Người nhận dị ứng hay không thích gì">
              <div className="flex flex-wrap gap-2">
                {AVOIDS.map((a) => (
                  <Chip key={a} selected={avoid.includes(a)} onClick={() => toggleAvoid(a)} tone="danger">
                    {avoid.includes(a) ? <X className="size-3.5" aria-hidden="true" /> : null}
                    {a}
                  </Chip>
                ))}
              </div>
            </ChoiceGroup>
          </section>

          {/* ---------- 3. Ngan sach & lien he ---------- */}
          <section aria-labelledby="step-3" className="space-y-9">
            <StepHeading id="step-3" step="03" title="Ngân sách và thời gian" />

            <div>
              <Field id="budget" label="Ngân sách (VND)" error={errors.budget} required>
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min={200000}
                    step={50000}
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    className="sm:max-w-xs"
                  />
                )}
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                {BUDGETS.map((value) => (
                  <Chip key={value} selected={amount === value} onClick={() => setBudget(String(value))} small>
                    <span className="num">{formatPrice(value)}</span>
                  </Chip>
                ))}
              </div>
              {belowSize ? (
                <p className="mt-3 text-xs text-accent">
                  {chosenSize.label} thường từ {formatPrice(chosenSize.from)} — studio có thể gợi ý cỡ nhỏ hơn hoặc
                  thay loại hoa cho vừa ngân sách.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field id="desiredDate" label="Ngày cần hoa" error={errors.desiredDate} hint="Sớm nhất từ ngày mai.">
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    min={minDate}
                    value={desiredDate}
                    onChange={(event) => setDesiredDate(event.target.value)}
                  />
                )}
              </Field>
              <Field id="contactPhone" label="Số điện thoại" error={errors.contactPhone} hint="Để thợ hoa gọi hỏi thêm khi cần.">
                {(props) => (
                  <Input
                    {...props}
                    type="tel"
                    maxLength={20}
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="0900 123 456"
                  />
                )}
              </Field>
            </div>

            <Field
              id="notes"
              label="Ghi chú thêm cho thợ hoa"
              hint="Không bắt buộc. Người nhận là ai, lời nhắn muốn gửi gắm, chi tiết đặc biệt…"
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={4}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tặng mẹ nhân sinh nhật 60 tuổi, mẹ thích sự nhẹ nhàng. Muốn cài thêm một cành lan nhỏ."
                />
              )}
            </Field>

            <div>
              <p className="label-micro mb-3 text-muted-foreground">Ảnh mẫu tham khảo (tuỳ chọn)</p>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-4 border border-dashed p-4 transition-colors",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  errors.image ? "border-danger" : "border-border-strong hover:border-accent",
                )}
              >
                {preview ? (
                  <img src={preview} alt="Ảnh mẫu đã chọn" className="size-20 shrink-0 object-cover" />
                ) : (
                  <span className="inline-flex size-20 shrink-0 items-center justify-center bg-surface-raised">
                    <ImagePlus className="size-5 text-accent" aria-hidden="true" />
                  </span>
                )}
                <span className="text-sm font-light text-muted-foreground">
                  {image ? image.name : "Chọn ảnh JPG, PNG hoặc WEBP, tối đa 5MB"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                />
              </label>
              {errors.image ? <p className="mt-2 text-xs text-danger">{errors.image}</p> : null}
            </div>

            {/* Man hinh hep: khung tom tat nam cuoi trang, nut gui o day cho gan tay */}
            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full lg:hidden">
              {submitting ? "Đang gửi…" : "Gửi yêu cầu cho studio →"}
            </Button>
          </section>
        </form>

        {/* ---------- Tom tat bo hoa, cap nhat theo tung lua chon ---------- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="bg-surface p-7">
            <h2 className="font-display text-2xl font-semibold italic text-foreground">Bó hoa của bạn</h2>
            <dl className="mt-6 space-y-3.5 text-sm">
              <SummaryRow label="Dịp">{occasionLabel}</SummaryRow>
              <SummaryRow label="Kiểu">{chosenArrangement?.label}</SummaryRow>
              <SummaryRow label="Cỡ">{chosenSize ? `${chosenSize.label} · ${chosenSize.detail}` : null}</SummaryRow>
              <SummaryRow label="Hoa">{flowers.length ? flowers.join(", ") : null}</SummaryRow>
              <SummaryRow label="Màu">
                {colors.length || colorNote.trim() ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {colors.map((c) => (
                      <span
                        key={c}
                        aria-hidden="true"
                        className="inline-block size-3.5 rounded-full ring-1 ring-border-strong/60"
                        style={{ background: SWATCH[c] }}
                      />
                    ))}
                    <span>{colorsText}</span>
                  </span>
                ) : null}
              </SummaryRow>
              <SummaryRow label="Phong cách">{style}</SummaryRow>
              {chosenArrangement?.wrapped ? <SummaryRow label="Giấy gói">{wrapping}</SummaryRow> : null}
              <SummaryRow label="Tránh">{avoid.length ? avoid.join(", ") : null}</SummaryRow>
              <SummaryRow label="Ngày">
                {desiredDate
                  ? desiredDate.split("-").reverse().join("/") + (desiredDate === minDate ? " (ngày mai)" : "")
                  : null}
              </SummaryRow>
            </dl>

            <div className="mt-6 flex items-baseline justify-between border-t border-border-strong/40 pt-5">
              <span className="text-sm text-muted-foreground">Ngân sách</span>
              <span className="num font-display text-2xl font-semibold italic text-accent">
                {Number.isFinite(amount) && amount > 0 ? formatPrice(amount) : "—"}
              </span>
            </div>

            <Button
              type="submit"
              form="custom-order-form"
              variant="primary"
              size="lg"
              disabled={submitting}
              className="mt-6 hidden w-full lg:flex"
            >
              {submitting ? "Đang gửi…" : "Gửi yêu cầu cho studio →"}
            </Button>

            <p className="mt-5 text-xs font-light leading-relaxed text-muted-foreground">
              Thợ hoa báo giá trong giờ làm việc. Bạn đồng ý thì chọn người nhận, giờ giao, thiệp và thanh toán như
              đơn thường; ảnh bó thật gửi bạn trước khi giao. Theo dõi ở{" "}
              <Link to="/tai-khoan/yeu-cau-dat-hoa" className="text-accent hover:text-accent-strong">
                Tài khoản › Yêu cầu đặt hoa
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
   Thanh phan nho dung trong trang
   ============================================================ */

function StepHeading({ id, step, title }: { id: string; step: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-border pb-4">
      <span className="num label-micro text-accent">{step}</span>
      <h2 id={id} className="font-display text-2xl font-semibold italic text-foreground">
        {title}
      </h2>
    </div>
  );
}

function ChoiceGroup({
  legend,
  hint,
  required,
  error,
  fieldsetRef,
  children,
}: {
  legend: string;
  hint?: string;
  required?: boolean;
  error?: string;
  fieldsetRef?: Ref<HTMLFieldSetElement>;
  children: ReactNode;
}) {
  return (
    <fieldset ref={fieldsetRef} aria-invalid={error ? true : undefined}>
      <legend className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="label-micro text-muted-foreground">
          {legend}
          {required ? <span className="text-accent"> *</span> : null}
        </span>
        {hint ? <span className="text-xs font-light text-muted-foreground/80">{hint}</span> : null}
      </legend>
      {children}
      {error ? (
        <p role="alert" className="mt-2.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Chip({
  selected,
  disabled,
  dashed,
  small,
  tone = "accent",
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  dashed?: boolean;
  small?: boolean;
  tone?: "accent" | "danger";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-colors",
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-[0.8125rem]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-40",
        dashed && !selected && "border-dashed",
        selected
          ? tone === "danger"
            ? "border-danger/70 bg-danger/10 text-danger"
            : "border-accent bg-accent/15 text-accent"
          : "border-border text-muted-foreground hover:border-accent/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  const empty = children == null || children === "";
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0", empty ? "text-muted-foreground/50" : "text-foreground")}>{empty ? "—" : children}</dd>
    </div>
  );
}
