import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BouquetSizeOption, CustomRequest, Product } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * Moi tai khoan mot gio rieng. TRUOC DAY dung chung mot khoa "cart" cho ca trinh duyet,
 * nen dang nhap bang tai khoan khac van thay nguyen gio cua nguoi truoc — vua sai
 * ve nghiep vu vua lo du lieu giua hai nguoi dung chung mot may.
 */
const GUEST_KEY = "cart:guest";

function keyFor(userId: number | null): string {
  return userId == null ? GUEST_KEY : `cart:u${userId}`;
}

const MAX_QUANTITY = 99;

/**
 * Mien phi giao hang tu nguong nay (VND) — khop voi order-service va landing page.
 * DELIVERY_FEE chi la phi du phong khi chua cau hinh GHN; co GHN thi phi tinh theo dia chi
 * o trang thanh toan.
 */
export const FREE_DELIVERY_THRESHOLD = 800_000;
export const DELIVERY_FEE = 30_000;

/**
 * Mot dong gio: MOT trong hai loai.
 *  - Bo hoa co san: productId + size. Cung bo o hai co la hai dong rieng.
 *  - Hoa dat theo yeu cau da duoc bao gia: customRequestId, so luong luon la 1.
 * `key` phan biet cac dong - thao tac sua / xoa deu theo key.
 */
export type CartLine = {
  key: string;
  productId: number | null;
  /** Ma co bo (SMALL / STANDARD / LARGE); null o dong hoa theo yeu cau. */
  size: string | null;
  /** Vd. "Lớn · 23 bông" - chi de hien thi. */
  sizeLabel: string | null;
  customRequestId: number | null;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  /** Phai dat truoc bao nhieu ngay - trang thanh toan dung de chan ngay giao. */
  leadDays: number;
};

const DEFAULT_SIZE = "STANDARD";

function productKey(productId: number, size: string): string {
  return `p${productId}:${size}`;
}

/** Nhan co bo kem so bong: "Lớn · 23 bông". */
// eslint-disable-next-line react-refresh/only-export-components
export function sizeLabelOf(option: BouquetSizeOption): string {
  return option.stems == null ? option.label : `${option.label} · ${option.stems} bông`;
}

type CartContextValue = {
  lines: CartLine[];
  /** Tong SO LUONG (khong phai so dong) */
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  /** Tang moi lan gio hang duoc them hang — dung de kich hoat hieu ung badge */
  bumpToken: number;
  add: (product: Product, quantity?: number, size?: string) => void;
  /** Cho yeu cau dat hoa da bao gia vao gio (thay dong cu cua chinh yeu cau do neu co). */
  addCustomRequest: (request: CustomRequest) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Gio hang — PHAN MO RONG ngoai SOS01-SOS10.
 *
 * Luu trong localStorage, MOI TAI KHOAN MOT KHOA RIENG (xem keyFor).
 * Khach chua dang nhap dung khoa rieng "cart:guest"; khi dang nhap ma tai khoan do
 * chua co gio thi gio cua khach duoc mang theo — dung nhu mong doi khi ai do
 * chon hoa xong moi dang nhap de dat.
 *
 * `price` o day CHI de hien thi. Khi dat hang, frontend chi gui productId + co bo + so luong
 * (hoac customRequestId); backend tu hoi gia va tinh lai toan bo (xem OrderService).
 */
function readStored(storageKey: string): CartLine[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is Partial<CartLine> =>
          typeof line === "object" &&
          line !== null &&
          (typeof (line as CartLine).productId === "number" ||
            typeof (line as CartLine).customRequestId === "number") &&
          typeof (line as CartLine).quantity === "number" &&
          (line as CartLine).quantity > 0,
      )
      .map((line): CartLine => {
        // Gio luu tu truoc khi co co bo: chi co productId -> coi la co Tieu chuan
        const custom = line.customRequestId ?? null;
        const size = custom != null ? null : (line.size ?? DEFAULT_SIZE);
        return {
          key: line.key ?? (custom != null ? `r${custom}` : productKey(line.productId as number, size ?? DEFAULT_SIZE)),
          productId: line.productId ?? null,
          size,
          sizeLabel: line.sizeLabel ?? null,
          customRequestId: custom,
          name: line.name ?? "",
          price: line.price ?? 0,
          imageUrl: line.imageUrl ?? null,
          quantity: line.quantity as number,
          leadDays: line.leadDays ?? 0,
        };
      });
  } catch {
    // localStorage hong hoac JSON sai dinh dang -> gio rong, khong lam vo trang
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = keyFor(userId);

  /*
    Giu `lines` va khoa ma no THUOC VE trong cung mot state.
    Neu tach ra hai bien, o lan render ma tai khoan vua doi (khoa moi nhung lines
    van la cua nguoi cu), effect ghi xuong storage se dem gio cua nguoi cu ghi vao
    khoa cua nguoi moi — dung lai lo du lieu ma minh dang di sua.
  */
  const [cart, setCart] = useState<{ key: string; lines: CartLine[] }>(() => ({
    key: storageKey,
    lines: readStored(storageKey),
  }));
  const lines = cart.lines;

  const [bumpToken, setBumpToken] = useState(0);
  const previousCount = useRef<number | null>(null);

  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  // Doi danh tinh (dang nhap / dang xuat / doi tai khoan) -> nap gio cua danh tinh do
  useEffect(() => {
    if (cart.key === storageKey) return;

    let next = readStored(storageKey);

    /*
      Dang nhap tu trang thai khach: mang gio dang chon theo, nhung CHI khi tai khoan
      do chua co gio san — khong duoc de gio cu cua ho bi de mat.
      Chieu nguoc lai (dang xuat) thi khong mang gi sang gio khach.
    */
    if (userId != null && cart.key === GUEST_KEY && next.length === 0) {
      const guestLines = readStored(GUEST_KEY);
      if (guestLines.length > 0) {
        next = guestLines;
        try {
          localStorage.removeItem(GUEST_KEY);
        } catch {
          /* bo qua */
        }
      }
    }

    setCart({ key: storageKey, lines: next });
  }, [storageKey, userId, cart.key]);

  // Ghi xuong localStorage moi khi gio doi
  useEffect(() => {
    // Chua dong bo xong sau khi doi tai khoan -> chua duoc ghi
    if (cart.key !== storageKey) return;
    try {
      localStorage.setItem(cart.key, JSON.stringify(cart.lines));
    } catch {
      /* che do rieng tu: van dung duoc trong phien hien tai */
    }
  }, [cart, storageKey]);

  // Dong bo giua nhieu tab — chi nghe dung khoa cua danh tinh dang mo
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setCart({ key: storageKey, lines: readStored(storageKey) });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);

  // Chi bump khi so luong TANG — khong bump luc trang vua tai, khong bump khi giam
  useEffect(() => {
    if (previousCount.current === null) {
      previousCount.current = count;
      return;
    }
    if (count > previousCount.current) setBumpToken((token) => token + 1);
    previousCount.current = count;
  }, [count]);

  /*
    Helper chung cho moi thao tac sua gio: chi doi phan `lines`, GIU NGUYEN `key`.
    Nho vay khong thao tac nao vo tinh gan gio cua nguoi nay vao khoa cua nguoi khac.
  */
  const updateLines = useCallback((fn: (current: CartLine[]) => CartLine[]) => {
    setCart((current) => ({ key: current.key, lines: fn(current.lines) }));
  }, []);

  const add = useCallback(
    (product: Product, quantity = 1, size = DEFAULT_SIZE) => {
      // Gia hien thi theo co; backend van tu hoi gia khi dat hang
      const option = product.sizes?.find((s) => s.code === size) ?? null;
      const code = option?.code ?? DEFAULT_SIZE;
      const key = productKey(product.id, code);
      updateLines((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) {
          return current.map((line) =>
            line.key === key
              ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + quantity) }
              : line,
          );
        }
        return [
          ...current,
          {
            key,
            productId: product.id,
            size: code,
            sizeLabel: option && product.sized ? sizeLabelOf(option) : null,
            customRequestId: null,
            name: product.name,
            price: option?.price ?? product.price,
            imageUrl: product.imageUrl,
            quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)),
            leadDays: product.leadDays ?? 0,
          },
        ];
      });
    },
    [updateLines],
  );

  const addCustomRequest = useCallback(
    (request: CustomRequest) => {
      const key = `r${request.id}`;
      updateLines((current) => [
        ...current.filter((line) => line.key !== key),
        {
          key,
          productId: null,
          size: null,
          sizeLabel: request.occasion,
          customRequestId: request.id,
          name: `Hoa theo yêu cầu ${request.code}`,
          price: request.quotedPrice ?? 0,
          imageUrl: request.referenceImageUrl,
          quantity: 1,
          // Studio can it nhat mot ngay de nhap hoa cho bo lam rieng
          leadDays: 1,
        },
      ]);
    },
    [updateLines],
  );

  const setQuantity = useCallback(
    (key: string, quantity: number) => {
      updateLines((current) => {
        if (quantity <= 0) return current.filter((line) => line.key !== key);
        return current.map((line) =>
          // Hoa theo yeu cau la mot bo lam rieng: so luong luon la 1
          line.key === key && line.customRequestId == null
            ? { ...line, quantity: Math.min(MAX_QUANTITY, quantity) }
            : line,
        );
      });
    },
    [updateLines],
  );

  const remove = useCallback(
    (key: string) => {
      updateLines((current) => current.filter((line) => line.key !== key));
    },
    [updateLines],
  );

  const clear = useCallback(() => updateLines(() => []), [updateLines]);

  const subtotal = useMemo(
    () => Math.round(lines.reduce((sum, line) => sum + line.price * line.quantity, 0) * 100) / 100,
    [lines],
  );
  const deliveryFee = lines.length === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count,
      subtotal,
      deliveryFee,
      total,
      bumpToken,
      add,
      addCustomRequest,
      setQuantity,
      remove,
      clear,
    }),
    [lines, count, subtotal, deliveryFee, total, bumpToken, add, addCustomRequest, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải được dùng bên trong <CartProvider>");
  return ctx;
}
