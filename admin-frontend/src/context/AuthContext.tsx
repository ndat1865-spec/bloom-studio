import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { TOKEN_KEY, USER_KEY, clearStoredAuth } from "@/lib/api";
import type { AuthUser, Role } from "@/lib/api";

type AuthContextValue = {
  user: AuthUser | null;
  /** Role dung cho giao dien (an/hien menu). KHONG con gui kem request nao. */
  role: string;
  /** ADMIN: moi quyen, ke ca ma giam gia, Khoa API va tai khoan nhan vien. */
  isAdmin: boolean;
  isAuthenticated: boolean;
  /** Luu token va ho so sau khi dang nhap thanh cong. */
  signIn: (token: string, profile: AuthUser) => void;
  signOut: () => void;
  /** Ghi de ho so sau khi luu, de header va trang thanh toan cap nhat ngay. */
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Trang thai dang nhap.
 *
 * Khac han ban monolith: noi nay giu mot JWT do auth-service ky, chu khong phai
 * mot doi tuong user tu do ma client tu khai role. Nguoi dung co sua localStorage
 * bang DevTools cung khong tu nang quyen len duoc — chu ky JWT se khong con hop le,
 * va moi service deu tu xac thuc lai chu ky do.
 *
 * Ho so van duoc luu kem de header va trang thanh toan hien ngay khi mo trang,
 * khong phai cho mot vong goi API. Day chi la ban sao cho tien hien thi; quyen
 * thuc su nam trong token.
 */
function sanitize(next: AuthUser): AuthUser {
  return {
    id: next.id,
    username: next.username,
    role: next.role,
    fullName: next.fullName ?? null,
    email: next.email ?? null,
    phone: next.phone ?? null,
    address: next.address ?? null,
    city: next.city ?? null,
    displayName: next.displayName ?? next.fullName ?? next.username,
    hasDefaultAddress: next.hasDefaultAddress ?? false,
  };
}

/**
 * Doc phien da luu NGAY trong lan render dau tien (lazy initializer), khong dung
 * useEffect. Neu doc trong useEffect thi lan render dau user van la null, va
 * RequireRole se kip chuyen huong ve /login truoc khi effect kip chay — F5 mot
 * trang can dang nhap se luon bi da ra ngoai.
 */
function readStoredSession(): AuthUser | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (
      typeof parsed?.id === "number" &&
      typeof parsed?.username === "string" &&
      (["ADMIN", "STAFF", "CUSTOMER"] as Role[]).includes(parsed?.role as Role)
    ) {
      return sanitize(parsed as AuthUser);
    }
    clearStoredAuth();
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredSession());

  // Dong bo giua nhieu tab: dang xuat o tab nay thi tab kia cung thoat theo
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY || event.key === USER_KEY) {
        setUser(readStoredSession());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((profile: AuthUser) => {
    const safe = sanitize(profile);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(safe));
    } catch {
      /* che do rieng tu: van cho dung trong phien hien tai */
    }
    setUser(safe);
  }, []);

  const signIn = useCallback(
    (token: string, profile: AuthUser) => {
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* che do rieng tu */
      }
      persist(profile);
    },
    [persist],
  );

  const signOut = useCallback(() => {
    clearStoredAuth();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? "",
      isAdmin: user?.role === "ADMIN",
      isAuthenticated: user !== null,
      signIn,
      signOut,
      updateUser: persist,
    }),
    [user, signIn, signOut, persist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  return ctx;
}
