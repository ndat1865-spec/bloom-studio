/**
 * Client API tap trung cho toan bo frontend.
 *
 * - Chi tro toi api-gateway (VITE_API_BASE_URL). Frontend KHONG bao gio biet
 *   auth-service / product-service / order-service chay o cong nao.
 * - Tu dinh kem "Authorization: Bearer <token>" neu da dang nhap.
 * - Gap 401 (token het han hoac hong) thi tu dang xuat va dua ve /login.
 * - Voi FormData KHONG tu dat Content-Type de trinh duyet tu sinh multipart boundary
 * - Xu ly duoc body rong (204 No Content) — khong goi response.json() vo dieu kien
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
export const SERVER_ORIGIN = RAW_BASE.replace(/\/+$/, "");
export const API_BASE = `${SERVER_ORIGIN}/api`;

/** Key localStorage dung chung giua AuthContext va tang goi API nay. */
export const TOKEN_KEY = "bloom_token";
export const USER_KEY = "bloom_user";

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Loi mang / khong ket noi duoc server — phan biet voi loi HTTP co ma trang thai. */
export class NetworkError extends Error {
  constructor(message = "Khong thể kết nối tới server. Kiểm tra backend đã chạy chưa.") {
    super(message);
    this.name = "NetworkError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

function messageFor(status: number, payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const m = (payload as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (typeof payload === "string" && payload.trim()) return payload;
  switch (status) {
    case 400:
      return "Dữ liệu gửi lên không hợp lệ.";
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Tài khoản của bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu.";
    case 409:
      return "Dữ liệu bị trùng hoặc đang được tham chiếu.";
    default:
      return `Lỗi máy chủ (HTTP ${status}).`;
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const url = new URL(API_BASE + path);

  // Khong con ?role=ADMIN nhu ban monolith: role nam trong JWT da duoc
  // auth-service ky, backend tu doc ra chu khong tin tham so client gui.
  const headers: Record<string, string> = {};
  const token = readToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    // Khong dat Content-Type: de trinh duyet tu sinh boundary cua multipart
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { method, headers, body: payload, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError();
  }

  // 204 No Content va cac phan hoi rong: khong parse JSON
  const isEmpty =
    response.status === 204 || response.headers.get("content-length") === "0";
  const contentType = response.headers.get("content-type") ?? "";

  let data: unknown = null;
  if (!isEmpty) {
    const text = await response.text();
    if (text.length > 0) {
      data = contentType.includes("application/json") ? safeJson(text) : text;
    }
  }

  if (response.status === 401) {
    // Token het han / khong hop le -> xoa phien va dua ve trang dang nhap.
    // Backend phai tra dung 401 o day: mac dinh Spring Security tra 403 cho ca
    // truong hop thieu token, nen moi SecurityConfig deu khai authenticationEntryPoint.
    clearStoredAuth();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    const fieldErrors =
      data && typeof data === "object" && "fieldErrors" in data
        ? ((data as { fieldErrors?: Record<string, string> }).fieldErrors ?? undefined)
        : undefined;
    throw new ApiError(response.status, messageFor(response.status, data), fieldErrors);
  }

  return data as T;
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* che do rieng tu: bo qua */
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ============================================================
   Kieu du lieu khop voi response cua backend
   ============================================================ */

export type CategorySummary = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  /** Backend van tra truong nay tu dau; truoc day kieu o day thieu nen khong ai dung toi. */
  stockQuantity: number;
  imageUrl: string | null;
  category: CategorySummary | null;
  /** Ma dip (BIRTHDAY, LOVE...). Nhan tieng Viet lay tu getProductAttributes(). */
  occasions: string[];
  /** Ma mau (RED, PINK...) hoac null neu chua phan loai. */
  color: string | null;
  /** Diem trung binh 1 chu so thap phan, null khi chua co danh gia nao. */
  ratingAverage: number | null;
  ratingCount: number;
  /** Thanh phan bo hoa (loai hoa, la phu, giay goi). Null o san pham chua nhap. */
  composition: string | null;
  /** So bong cua co Tieu chuan; null = khong tinh theo bong (tron goi, trang tri). */
  stemCount: number | null;
  /** true = co ba co Nho / Tieu chuan / Lon. */
  sized: boolean;
  /** Phai dat truoc toi thieu bao nhieu ngay; 0 = giao trong ngay duoc. */
  leadDays: number;
  /** Cac co khach chon duoc, gia do backend tinh. Luon co it nhat dong STANDARD. */
  sizes: BouquetSizeOption[];
};

export type BouquetSizeOption = { code: string; label: string; stems: number | null; price: number };

/** Mot lua chon co nhan tieng Viet — dung cho dip, mau. */
export type LabeledOption = { value: string; label: string };

export type ProductAttributes = { occasions: LabeledOption[]; colors: LabeledOption[] };

/* ---- Danh gia san pham ---- */

export type Review = {
  id: number;
  productId: number;
  productName: string;
  /** Ban cong khai da che bot ("cu*****r"); ADMIN va chinh chu thay ten day du. */
  username: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReviewSummary = {
  average: number | null;
  count: number;
  /** Khoa "1".."5" -> so danh gia */
  counts: Record<string, number>;
};

export type ReviewEligibility = {
  canReview: boolean;
  reason: string | null;
  myReview: Review | null;
};

/* ---- Tuy chon thanh toan + ma giam gia ---- */

export type PricedOption = { value: string; label: string; description: string | null; price: number };

export type OrderOptions = {
  cards: PricedOption[];
  addons: PricedOption[];
  slots: { value: string; label: string; startHour: number; endHour: number }[];
  freeDeliveryThreshold: number;
  /** Phi co dinh - chi dung khi ghnEnabled = false. */
  deliveryFee: number;
  /** true: dia chi chon theo danh muc GHN, phi giao hang hoi GHN. */
  ghnEnabled: boolean;
  /** Dang dung moi truong thu GHN (khong co shipper that) - hien cong cu gia lap shipper. */
  ghnSandbox?: boolean;
  /** Hom nay theo gio Viet Nam (yyyy-MM-dd) - dung thay dong ho may khach. */
  today: string;
  /** Sau gio nay khong nhan don giao trong ngay. */
  sameDayCutoffHour: number;
  sameDayOpen: boolean;
  /** Tinh GHN studio giao toi; rong = moi noi. */
  deliveryProvinceIds: number[];
  deliveryAreaLabel: string;
};

/* ---- Giao hang GHN + thanh toan truc tuyen ---- */

export type Place = { id: number; name: string };
export type Ward = { code: string; name: string };

export type PaymentMethodCode = "COD" | "VNPAY" | "MOMO" | "ZALOPAY";
export type OnlineProvider = Exclude<PaymentMethodCode, "COD">;

export type PaymentMethodOption = {
  code: PaymentMethodCode;
  label: string;
  description: string;
  online: boolean;
};

/** Mot giao dich o payment-service. payUrl chi co khi con cho thanh toan. */
export type Payment = {
  id: number;
  orderId: number;
  orderCode: string;
  provider: OnlineProvider;
  providerLabel: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDING" | "REFUNDED";
  txnRef: string;
  providerTxnId: string | null;
  message: string | null;
  payUrl: string | null;
  refundRequired: boolean;
  createdAt: string;
  paidAt: string | null;
  refundTxnId: string | null;
  refundedAt: string | null;
};

export type PublicVoucher = {
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  endDate: string | null;
};

export type VoucherCheck = { code: string; description: string | null; discount: number };

export type Voucher = {
  id: number;
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usedCount: number;
  onePerCustomer: boolean;
  active: boolean;
  createdAt: string;
  /** Ma rieng cua mot khach (null = ma chung). */
  ownerUserId: number | null;
  ownerUsername: string | null;
  /** Ma san: khach phai bam Luu o trang Voucher cua customer-frontend moi dung duoc. */
  claimRequired: boolean;
  /** So luot luu toi da (null = khong gioi han). */
  claimLimit: number | null;
  claimedCount: number;
};

export type VoucherPayload = {
  code: string;
  description: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  onePerCustomer: boolean;
  active: boolean;
  ownerUserId: number | null;
  ownerUsername: string | null;
  claimRequired: boolean;
  claimLimit: number | null;
};

export type Category = { id: number; name: string; productCount: number };

/** Mot dong nhat ky cua notification-service. */
export type NotificationLog = {
  id: number;
  eventType: string;
  orderId: number | null;
  orderCode: string | null;
  audience: "CUSTOMER" | "SHOP";
  recipient: string | null;
  subject: string | null;
  status: "SENT" | "FAILED" | "SKIPPED";
  detail: string | null;
  createdAt: string;
};

/**
 * Khoa API cua doi tac. KHONG co truong keyValue — backend chi luu SHA-256 nen
 * khoa goc khong ton tai de ma tra ve. keyPrefix chi du de nhan ra dong nao la khoa nao.
 */
export type ApiKey = {
  id: number;
  keyPrefix: string;
  ownerName: string;
  scopes: string[];
  status: "ACTIVE" | "REVOKED";
  usable: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  /** So request/phut toi da, Gateway chan bang 429 khi vuot. */
  rateLimitPerMinute: number;
};

/** Chi tra ve dung mot lan, ngay sau khi cap khoa. */
export type ApiKeyCreated = { keyValue: string; warning: string; key: ApiKey };

export type CreateApiKeyPayload = {
  ownerName: string;
  scopes: string[];
  /** null = khong het han. */
  daysValid: number | null;
  /** null = mac dinh 60. */
  rateLimitPerMinute?: number | null;
};

export type Page<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

/**
 * ADMIN: toan quyen. STAFF (nhan vien): xu ly don, hoa, danh muc, danh gia, chi XEM ma
 * giam gia, khong vao Khoa API va Nhan vien. CUSTOMER khong vao duoc app quan tri.
 */
export type Role = "ADMIN" | "STAFF" | "CUSTOMER";

/** Hai role duoc vao app quan tri. */
export const BACKOFFICE_ROLES: readonly Role[] = ["ADMIN", "STAFF"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  CUSTOMER: "Khách hàng",
};

/** Mot tai khoan trong danh sach quan tri (GET /users). */
export type ManagedUser = AuthUser & {
  email?: string | null;
};

/**
 * Tai khoan dang nhap + ho so.
 *
 * Cac truong ho so co the null: tai khoan tao truoc khi co tinh nang ho so
 * van dang nhap binh thuong, chi la chua dien gi.
 */
export type AuthUser = {
  id: number;
  username: string;
  role: Role;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  /** Ho ten that neu co, khong thi username. Backend tinh san. */
  displayName?: string | null;
  /** Da du phone + address de dien san form thanh toan chua. */
  hasDefaultAddress?: boolean;
};

/** Body cua PUT /users/{id}/profile. Chuoi rong = xoa trong truong do. */
export type ProfilePayload = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

/* ---- Tong quan ADMIN: PHAN MO RONG ngoai SOS01-SOS10 ---- */

/**
 * Ket qua POST /api/auth/login.
 *
 * Chi co token va vai thong tin toi thieu — KHONG co ho so day du va tuyet doi
 * khong co password. Ho so lay rieng bang getMe() sau khi da co token.
 */
export type LoginResponse = {
  userId: number;
  token: string;
  username: string;
  role: Role;
};

/** Phan so lieu do order-service tu tinh duoc tren CSDL cua chinh no. */
export type OrderOverview = Omit<
  AdminOverview,
  "totalProducts" | "totalCategories" | "totalCustomers"
>;

export type AdminOverview = {
  from: string;
  to: string;
  revenue: number;
  cancelledValue: number;
  averageOrderValue: number;
  orderCount: number;
  pendingCount: number;
  confirmedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  daily: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: number; name: string; quantity: number; revenue: number }[];
  totalProducts: number;
  totalCategories: number;
  /** null khi nhan vien xem: danh sach tai khoan chi ADMIN doc duoc. */
  totalCustomers: number | null;
};

/* ---- Don hang: PHAN MO RONG ngoai SOS01-SOS10 ---- */

export type OrderItem = {
  id: number;
  productId: number | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
  /** Ma co bo, null o don cu va dong hoa theo yeu cau. */
  size: string | null;
  /** Vd. "Lớn · 23 bông"; dong hoa theo yeu cau thi la dip tang. */
  sizeLabel: string | null;
  customRequestId: number | null;
};

export type Order = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  address: string;
  note: string | null;
  deliveryDate: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  statusLabel: string;
  createdAt: string;
  username: string | null;
  items: OrderItem[];
  // ---- qua tang ----
  senderName: string | null;
  senderPhone: string | null;
  anonymousSender: boolean;
  cardType: string;
  cardTypeLabel: string;
  cardMessage: string | null;
  timeSlot: string | null;
  timeSlotLabel: string | null;
  /** Khung giao 1 tieng khach chon: gio bat dau (10 = 10:00 – 11:00); null = ca buoi / ca ngay. */
  deliveryHour?: number | null;
  deliveryTimeLabel?: string | null;
  addons: { code: string; name: string; unitPrice: number; quantity: number; lineTotal: number }[];
  // ---- tien: don cu truoc khi co tinh nang thi bang 0 ----
  extrasTotal: number;
  discount: number;
  voucherCode: string | null;
  // ---- thanh toan ----
  paymentMethod: PaymentMethodCode;
  paymentMethodLabel: string;
  paymentStatus: "UNPAID" | "PAID" | "REFUND_PENDING" | "REFUNDED";
  paymentStatusLabel: string;
  paidAt: string | null;
  // ---- giao hang GHN: null o don dia chi go tu do ----
  provinceId: number | null;
  districtId: number | null;
  wardCode: string | null;
  ghnOrderCode: string | null;
  shippingStatus: string | null;
  shippingStatusLabel: string | null;
  expectedDeliveryAt: string | null;
  shippingUpdatedAt: string | null;
  /** Phi cua hang tra GHN cho van don. */
  ghnFee: number | null;
  /** Shipper thu ho luc tao van don (0 = khach da tra truc tuyen). */
  codAmount: number | null;
  /** Khoi luong GHN tinh phi, gram. */
  shippingWeight: number | null;
  /** Hanh trinh van don, cu nhat truoc. */
  shippingEvents: ShippingEvent[];
  confirmedAt: string | null;
  preparingAt: string | null;
  shippingAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  /** Anh bo hoa that cua hang chup truoc khi giao. */
  arrangementPhotoUrl?: string | null;
  arrangementPhotoAt?: string | null;
};

export type CustomRequestStatus = "NEW" | "QUOTED" | "ORDERED" | "REJECTED" | "CANCELLED";

/** Yeu cau dat hoa theo y khach. */
export type CustomRequest = {
  id: number;
  code: string;
  username: string | null;
  occasion: string | null;
  budget: number;
  colors: string | null;
  /** Lua chon tren trang Dat hoa theo yeu cau (nhan tieng Viet). */
  arrangement: string | null;
  sizeOption: string | null;
  flowers: string | null;
  style: string | null;
  wrapping: string | null;
  avoid: string | null;
  description: string;
  referenceImageUrl: string | null;
  desiredDate: string | null;
  contactPhone: string | null;
  status: CustomRequestStatus;
  statusLabel: string;
  quotedPrice: number | null;
  shopNote: string | null;
  quotedAt: string | null;
  handledBy: string | null;
  createdAt: string;
  orderId: number | null;
  orderCode: string | null;
};

export type CreateCustomRequestPayload = {
  occasion: string | null;
  budget: number;
  colors: string | null;
  description: string;
  desiredDate: string | null;
  contactPhone: string | null;
};

export type ShippingEvent = { status: string; label: string; at: string };

export type CreateOrderPayload = {
  customerName: string;
  phone: string;
  address: string;
  note: string | null;
  deliveryDate: string | null;
  /**
   * Bo hoa: productId + co bo + so luong. Hoa theo yeu cau: customRequestId.
   * KHONG co gia - backend tu hoi product-service / lay gia studio da bao.
   */
  items: { productId?: number; size?: string; customRequestId?: number; quantity: number }[];
  senderName?: string | null;
  senderPhone?: string | null;
  anonymousSender?: boolean;
  cardType?: string;
  cardMessage?: string | null;
  timeSlot?: string | null;
  /** Khung giao 1 tieng: gio bat dau 8..20. */
  deliveryHour?: number | null;
  /** CHI ma qua + so luong, gia do backend tu tra. */
  addons?: { code: string; quantity: number }[];
  voucherCode?: string | null;
  /** Ma GHN - bat buoc khi options.ghnEnabled. address khi do chi la so nha + duong. */
  provinceId?: number | null;
  districtId?: number | null;
  wardCode?: string | null;
  /** Mac dinh COD. */
  paymentMethod?: PaymentMethodCode;
};

/* ---- Chat khach - studio (chat-service) ---- */

export type ChatStatus = "AI" | "WAITING_STAFF" | "WITH_STAFF" | "CLOSED";

export type ChatMessage = {
  id: number;
  senderType: "CUSTOMER" | "AI" | "STAFF" | "SYSTEM";
  senderName: string | null;
  content: string;
  createdAt: string;
  /** Nut tra loi nhanh cua tro ly tu dong - bam thi gui action ve bot. */
  quickReplies: ChatQuickReply[];
  /** The bo hoa tro ly goi y. */
  cards: ChatProductCard[];
};

export type ChatQuickReply = { label: string; action: string };

export type ChatProductCard = {
  id: number;
  name: string;
  imageUrl: string | null;
  priceFrom: number | null;
  sizeCount: number;
  stems: number | null;
  leadDays: number;
  link: string;
};

export type ChatConversation = {
  id: number;
  userId: number;
  username: string | null;
  status: ChatStatus;
  statusLabel: string;
  assignedStaff: string | null;
  createdAt: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadForStaff: number;
  unreadForCustomer: number;
  /** Tro ly AI dang soan tra loi. */
  aiPending: boolean;
};

/** Mot lan hoi: trang thai cuoc chat + cac tin moi. conversation null = chua tung chat. */
export type ChatSnapshot = {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  aiEnabled: boolean;
};

export type ProductQuery = {
  name?: string;
  categoryId?: number | null;
  occasion?: string | null;
  color?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  page?: number;
  size?: number;
  sort?: string;
};

/* ============================================================
   Ham goi API theo tung nhom chuc nang
   ============================================================ */

export const api = {
  /**
   * Dang nhap. Tra ve JWT da ky chu KHONG tra ve ca ho so nhu ban monolith —
   * ho so lay rieng bang getMe() sau khi da co token.
   */
  login(username: string, password: string, signal?: AbortSignal) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { username, password },
      signal,
    });
  },

  /**
   * SOS08 (phan tu nghien cuu) — dang ky tai khoan.
   * Backend luon gan role CUSTOMER, khong nhan role tu client.
   */
  register(username: string, password: string, signal?: AbortSignal) {
    return request<AuthUser>("/auth/register", {
      method: "POST",
      body: { username, password },
      signal,
    });
  },

  /**
   * Ho so cua chinh nguoi dang dang nhap.
   * Khong con truyen id tren URL nhu ban monolith: backend lay id tu token,
   * nen khong the doi so tren URL de xem ho so nguoi khac (lo hong IDOR).
   */
  getMe(signal?: AbortSignal) {
    return request<AuthUser>("/auth/me", { signal });
  },

  /**
   * Cap nhat ho so + dia chi mac dinh.
   * KHONG dung duoc de doi username/password/role — backend co endpoint rieng cho viec do.
   */
  updateProfile(payload: ProfilePayload, signal?: AbortSignal) {
    return request<AuthUser>("/auth/me/profile", {
      method: "PUT",
      body: payload,
      signal,
    });
  },

  /**
   * Don hang cua chinh toi. Khong con gui userId len nua — backend lay tu token,
   * nen khong the sua userId de xem don cua nguoi khac.
   */
  listMyOrders(page = 0, size = 10, signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return request<Page<Order>>(`/orders/my?${params}`, { signal });
  },

  /**
   * So lieu trang Tong quan cua ADMIN.
   *
   * Ban monolith co san GET /admin/overview dem tat ca bang mot cau truy van tren
   * cung mot CSDL. Sau khi tach, du lieu nam o ba CSDL khac nhau nen khong lam
   * vay duoc nua. Cach ghep:
   *   - So lieu don hang (doanh thu, bieu do ngay, top san pham): order-service
   *     tu tinh tren DB cua no va tra ve qua GET /api/orders/overview.
   *   - Ba con so tong (san pham, danh muc, khach hang): frontend goi song song
   *     ba service roi ghep lai o day.
   *
   * Day la API composition phia client — xem docs/blueprint-api.md.
   */
  async getAdminOverview(from?: string, to?: string, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();

    const [orderStats, products, categories, users] = await Promise.all([
      request<OrderOverview>(`/orders/overview${query ? `?${query}` : ""}`, { signal }),
      // size=1: chi can totalElements, khong can tai ve ca danh sach
      request<Page<Product>>("/products?page=0&size=1", { signal }),
      request<Category[]>("/categories", { signal }),
      // GET /users chi danh cho ADMIN - nhan vien thi bo con so nay thay vi hong ca trang
      request<AuthUser[]>("/users", { signal }).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) return null;
        throw err;
      }),
    ]);

    return {
      ...orderStats,
      totalProducts: products.totalElements,
      totalCategories: categories.length,
      totalCustomers: users ? users.filter((u) => u.role === "CUSTOMER").length : null,
    } satisfies AdminOverview;
  },

  listProducts(query: ProductQuery = {}, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (query.name?.trim()) params.set("name", query.name.trim());
    if (query.categoryId != null) params.set("categoryId", String(query.categoryId));
    if (query.occasion) params.set("occasion", query.occasion);
    if (query.color) params.set("color", query.color);
    if (query.minPrice != null) params.set("minPrice", String(query.minPrice));
    if (query.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
    params.set("page", String(query.page ?? 0));
    params.set("size", String(query.size ?? 6));
    if (query.sort) params.set("sort", query.sort);
    return request<Page<Product>>(`/products?${params.toString()}`, { signal });
  },

  getProduct(id: number, signal?: AbortSignal) {
    return request<Product>(`/products/${id}`, { signal });
  },

  /** Danh sach dip + mau kem nhan tieng Viet — nguon duy nhat, frontend khong tu khai. */
  getProductAttributes(signal?: AbortSignal) {
    return request<ProductAttributes>("/products/attributes", { signal });
  },

  /* ---- Danh gia san pham ---- */

  listReviews(productId: number, page = 0, size = 5, signal?: AbortSignal) {
    return request<Page<Review>>(`/products/${productId}/reviews?page=${page}&size=${size}`, { signal });
  },

  getReviewSummary(productId: number, signal?: AbortSignal) {
    return request<ReviewSummary>(`/products/${productId}/reviews/summary`, { signal });
  },

  /** Can dang nhap. Cho biet co duoc danh gia khong va danh gia cu cua chinh minh. */
  getReviewEligibility(productId: number, signal?: AbortSignal) {
    return request<ReviewEligibility>(`/products/${productId}/reviews/eligibility`, { signal });
  },

  /** Tao moi hoac sua danh gia cua chinh minh. */
  submitReview(productId: number, rating: number, comment: string | null) {
    return request<Review>(`/products/${productId}/reviews`, {
      method: "POST",
      body: { rating, comment },
    });
  },

  /** ADMIN: hidden = undefined -> tat ca. */
  listAllReviews(hidden: boolean | undefined, page = 0, size = 10, signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (hidden !== undefined) params.set("hidden", String(hidden));
    return request<Page<Review>>(`/reviews?${params}`, { signal });
  },

  setReviewHidden(id: number, hidden: boolean) {
    return request<Review>(`/reviews/${id}/visibility`, { method: "PATCH", body: { hidden } });
  },

  deleteReview(id: number) {
    return request<void>(`/reviews/${id}`, { method: "DELETE" });
  },

  /* ---- Tuy chon thanh toan + ma giam gia ---- */

  getOrderOptions(signal?: AbortSignal) {
    return request<OrderOptions>("/orders/options", { signal });
  },

  listPublicVouchers(signal?: AbortSignal) {
    return request<PublicVoucher[]>("/vouchers/public", { signal });
  },

  /** Xem truoc so tien giam. Khi dat hang that server tinh lai tu dau. */
  checkVoucher(code: string, amount: number) {
    return request<VoucherCheck>("/vouchers/check", { method: "POST", body: { code, amount } });
  },

  listVouchers(signal?: AbortSignal) {
    return request<Voucher[]>("/vouchers", { signal });
  },

  createVoucher(payload: VoucherPayload) {
    return request<Voucher>("/vouchers", { method: "POST", body: payload });
  },

  updateVoucher(id: number, payload: VoucherPayload) {
    return request<Voucher>(`/vouchers/${id}`, { method: "PUT", body: payload });
  },

  deleteVoucher(id: number) {
    return request<void>(`/vouchers/${id}`, { method: "DELETE" });
  },

  createProduct(product: ProductPayload) {
    return request<Product>("/products", { method: "POST", body: product });
  },

  updateProduct(id: number, product: ProductPayload) {
    return request<Product>(`/products/${id}`, { method: "PUT", body: product });
  },

  deleteProduct(id: number) {
    return request<void>(`/products/${id}`, { method: "DELETE" });
  },

  /**
   * SOS07/SOS09 — luu file va cap nhat imageUrl, tra ve san pham da cap nhat.
   *
   * role duoc gui DUY NHAT mot lan, trong form-data, dung nhu admin.js cua SOS09.
   * KHONG truyen them options.role: neu gui ca query param lan form field, Spring gop
   * hai gia tri thanh chuoi "ADMIN,ADMIN" va phep so sanh voi "ADMIN" se that bai (403).
   */
  uploadProductImage(id: number, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<Product>(`/products/${id}/upload-image`, { method: "POST", body: form });
  },

  /* ---- Don hang (phan mo rong) ---- */

  createOrder(payload: CreateOrderPayload) {
    return request<Order>("/orders", { method: "POST", body: payload });
  },

  getOrder(id: number, signal?: AbortSignal) {
    return request<Order>(`/orders/${id}`, { signal });
  },

  /* ---- Hop thu chat ---- */

  listChats(status: ChatStatus | null, page = 0, size = 30, signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set("status", status);
    return request<Page<ChatConversation>>(`/chat/conversations?${params}`, { signal });
  },

  chatSummary(signal?: AbortSignal) {
    return request<{ ai: number; waitingStaff: number; withStaff: number; closed: number }>(
      "/chat/conversations/summary",
      { signal },
    );
  },

  getChat(id: number, afterId?: number | null, signal?: AbortSignal) {
    const query = afterId != null ? `?afterId=${afterId}` : "";
    return request<ChatSnapshot>(`/chat/conversations/${id}${query}`, { signal });
  },

  sendStaffChat(id: number, content: string) {
    return request<ChatSnapshot>(`/chat/conversations/${id}/messages`, { method: "POST", body: { content } });
  },

  closeChat(id: number) {
    return request<ChatSnapshot>(`/chat/conversations/${id}/close`, { method: "POST" });
  },

  returnChatToAi(id: number) {
    return request<ChatSnapshot>(`/chat/conversations/${id}/return-to-ai`, { method: "POST" });
  },

  /* ---- Anh bo hoa thanh pham + dat hoa theo yeu cau ---- */

  uploadArrangementPhoto(orderId: number, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<Order>(`/orders/${orderId}/arrangement-photo`, { method: "POST", body: form });
  },

  listCustomRequests(status: CustomRequestStatus | null, page = 0, size = 20, signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set("status", status);
    return request<Page<CustomRequest>>(`/custom-requests?${params}`, { signal });
  },

  quoteCustomRequest(id: number, price: number, note: string | null) {
    return request<CustomRequest>(`/custom-requests/${id}/quote`, { method: "PUT", body: { price, note } });
  },

  rejectCustomRequest(id: number, note: string) {
    return request<CustomRequest>(`/custom-requests/${id}/reject`, { method: "PUT", body: { note } });
  },

  /* ---- Giao hang GHN (qua order-service; token GHN khong bao gio ra trinh duyet) ---- */

  listProvinces(signal?: AbortSignal) {
    return request<Place[]>("/shipping/provinces", { signal });
  },

  listDistricts(provinceId: number, signal?: AbortSignal) {
    return request<Place[]>(`/shipping/districts?provinceId=${provinceId}`, { signal });
  },

  listWards(districtId: number, signal?: AbortSignal) {
    return request<Ward[]>(`/shipping/wards?districtId=${districtId}`, { signal });
  },

  /** Xem truoc phi GHN. Khi dat hang server hoi GHN lai tu dau. */
  quoteShipping(districtId: number, wardCode: string, itemCount: number, signal?: AbortSignal) {
    return request<{ fee: number; provider: string }>("/shipping/fee", {
      method: "POST",
      body: { districtId, wardCode, itemCount },
      signal,
    });
  },

  /** ADMIN: tao van don GHN cho don. */
  createShipment(orderId: number) {
    return request<Order>(`/orders/${orderId}/shipment`, { method: "POST" });
  },

  /** Hoi GHN trang thai van don moi nhat. */
  refreshShipment(orderId: number) {
    return request<Order>(`/orders/${orderId}/shipment/refresh`, { method: "POST" });
  },

  /** CHI MOI TRUONG THU GHN: gia lap shipper lay hang / dang giao / da giao. */
  simulateShipment(orderId: number, status: "picked" | "delivering" | "delivered") {
    return request<Order>(`/orders/${orderId}/shipment/simulate`, { method: "POST", body: { status } });
  },

  /** Huy van don GHN (chi khi GHN chua lay hang) - studio chuyen sang tu giao. */
  cancelShipment(orderId: number) {
    return request<Order>(`/orders/${orderId}/shipment/cancel`, { method: "POST" });
  },

  /* ---- Thanh toan truc tuyen (payment-service) ---- */

  listPaymentMethods(signal?: AbortSignal) {
    return request<PaymentMethodOption[]>("/payments/methods", { signal });
  },

  /** Tao giao dich, tra ve payUrl. KHONG gui so tien: server lay tu don. */
  createPayment(orderId: number, provider: OnlineProvider) {
    return request<Payment>("/payments", { method: "POST", body: { orderId, provider } });
  },

  /** Chuyen nguyen tham so cong thanh toan gan vao URL tro ve de server kiem chu ky. */
  confirmPaymentReturn(params: Record<string, string>) {
    return request<Payment>("/payments/return", { method: "POST", body: params });
  },

  listOrderPayments(orderId: number, signal?: AbortSignal) {
    return request<Payment[]>(`/payments/order/${orderId}`, { signal });
  },

  refreshPayment(paymentId: number) {
    return request<Payment>(`/payments/${paymentId}/refresh`, { method: "POST" });
  },

  /** ADMIN: nhat ky email do notification-service gui. */
  listNotifications(page = 0, size = 15, signal?: AbortSignal) {
    return request<Page<NotificationLog>>(`/notifications?page=${page}&size=${size}`, { signal });
  },

  /** ADMIN: hoan toan bo tien qua API cua cong thanh toan. */
  refundPayment(paymentId: number, reason?: string) {
    return request<Payment>(`/payments/${paymentId}/refund`, { method: "POST", body: { reason: reason ?? null } });
  },

  /**
   * Danh sach don cho quan tri. filters: status (nhieu trang thai), q (ma don / nguoi nhan /
   * SDT / tai khoan / nguoi tang), deliveryDate (yyyy-MM-dd). Server loc, khong loc tren trang.
   */
  listOrders(
    page = 0,
    size = 10,
    signal?: AbortSignal,
    filters: { status?: string[]; q?: string; deliveryDate?: string } = {},
  ) {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.status?.length) params.set("status", filters.status.join(","));
    if (filters.q?.trim()) params.set("q", filters.q.trim());
    if (filters.deliveryDate) params.set("deliveryDate", filters.deliveryDate);
    return request<Page<Order>>(`/orders?${params.toString()}`, { signal });
  },

  /** So don moi trang thai + DUE_TODAY (con phai giao hom nay). */
  orderStatusCounts(signal?: AbortSignal) {
    return request<Record<string, number>>("/orders/status-counts", { signal });
  },

  updateOrderStatus(id: number, status: string) {
    return request<Order>(`/orders/${id}/status`, { method: "PUT", body: { status } });
  },

  /* ---- Tai khoan & nhan vien: chi ADMIN ---- */

  listUsers(signal?: AbortSignal) {
    return request<ManagedUser[]>("/users", { signal });
  },

  /** Tao tai khoan nhan vien / ADMIN. Khach hang tu dang ky ben cua hang. */
  createStaff(body: { username: string; password: string; fullName: string; role: "STAFF" | "ADMIN" }) {
    return request<ManagedUser>("/users", { method: "POST", body });
  },

  /** Doi quyen va/hoac dat lai mat khau. Quyen moi co hieu luc tu lan dang nhap sau. */
  updateUser(id: number, body: { role?: Role; password?: string }) {
    return request<ManagedUser>(`/users/${id}`, { method: "PUT", body });
  },

  deleteUser(id: number) {
    return request<void>(`/users/${id}`, { method: "DELETE" });
  },

  listCategories(signal?: AbortSignal) {
    return request<Category[]>("/categories", { signal });
  },

  createCategory(name: string) {
    return request<Category>("/categories", { method: "POST", body: { name } });
  },

  updateCategory(id: number, name: string) {
    return request<Category>(`/categories/${id}`, { method: "PUT", body: { name } });
  },

  deleteCategory(id: number) {
    return request<void>(`/categories/${id}`, { method: "DELETE" });
  },

  // ---------- API Key doi tac (ADMIN) ----------

  listApiKeys() {
    return request<ApiKey[]>("/api-keys");
  },

  /**
   * Phan hoi chua keyValue — LAN DUY NHAT khoa goc roi khoi he thong.
   * Khong luu lai o bat cu dau, chi hien cho ADMIN chep.
   */
  createApiKey(payload: CreateApiKeyPayload) {
    return request<ApiKeyCreated>("/api-keys", { method: "POST", body: payload });
  },

  /** Doi han muc; Gateway nho ket qua kiem tra khoa nen co hieu luc cham toi 1 phut. */
  updateApiKeyRateLimit(id: number, rateLimitPerMinute: number) {
    return request<ApiKey>(`/api-keys/${id}/rate-limit`, { method: "PATCH", body: { rateLimitPerMinute } });
  },

  revokeApiKey(id: number) {
    return request<ApiKey>(`/api-keys/${id}/revoke`, { method: "POST" });
  },

  deleteApiKey(id: number) {
    return request<void>(`/api-keys/${id}`, { method: "DELETE" });
  },
};

export type ProductPayload = {
  name: string;
  price: number;
  description: string;
  /** Bat buoc — backend co @NotNull, thieu truong nay la 400 cho moi lenh luu. */
  stockQuantity: number;
  category: { id: number } | null;
  occasions: string[];
  color: string | null;
  composition: string | null;
  stemCount: number | null;
  sized: boolean;
  /** Bat buoc (backend @NotNull) - 0 = giao trong ngay duoc. */
  leadDays: number;
};
