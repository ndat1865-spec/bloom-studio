import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { Flower2, LogOut, MapPin, Package, TicketPercent, UserRound } from "lucide-react";
import { InitialsAvatar } from "@/components/site/InitialsAvatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Khung chung cua khu vuc Tai khoan: cot trai dinh danh + dieu huong, cot phai la noi dung.
 *
 * PHAN MO RONG ngoai SOS01-SOS10.
 * Khong co muc Doi tra — khong nam trong pham vi du an.
 */

const NAV_ITEMS = [
  { to: "/tai-khoan", label: "Thông tin cá nhân", icon: UserRound, end: true },
  { to: "/tai-khoan/dia-chi", label: "Sổ địa chỉ", icon: MapPin, end: false },
  { to: "/tai-khoan/don-hang", label: "Đơn hàng của tôi", icon: Package, end: false },
  { to: "/tai-khoan/yeu-cau-dat-hoa", label: "Yêu cầu đặt hoa", icon: Flower2, end: false },
  { to: "/tai-khoan/ma-giam-gia", label: "Mã giảm giá", icon: TicketPercent, end: false },
];

export function AccountLayout({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const name = user.displayName || user.fullName || user.username;

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="shell page-pad">
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[17rem_1fr]">
        {/* ---------- Cot trai: danh tinh + dieu huong ---------- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="bg-surface p-6">
            <div className="flex items-center gap-4">
              <InitialsAvatar name={name} src={user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold italic text-foreground">
                  {name}
                </p>
                <p className="label-micro mt-1.5 text-accent">
                  {user.role === "ADMIN" ? "Quản trị viên" : user.role === "STAFF" ? "Nhân viên" : "Khách hàng"}
                </p>
              </div>
            </div>

            {user.email ? (
              <p className="mt-5 truncate text-xs font-light text-muted-foreground">{user.email}</p>
            ) : null}

            <nav aria-label="Khu vực tài khoản" className="mt-7 flex flex-col border-t border-border pt-4">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-3.5 text-sm font-light transition-colors",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      isActive
                        ? "bg-surface-raised text-accent"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}

              <button
                type="button"
                onClick={handleSignOut}
                className="mt-4 flex items-center gap-3 border-t border-border px-3 pb-1 pt-5 text-sm font-light text-muted-foreground transition-colors hover:text-danger focus-visible:text-danger focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                Đăng xuất
              </button>
            </nav>
          </div>
        </aside>

        {/* ---------- Cot phai: tieu de trang + noi dung ---------- */}
        <div className="min-w-0">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="label-micro text-accent">{eyebrow}</p>
              <h1 className="display-section mt-5 text-foreground">{title}</h1>
              {description ? (
                <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </header>

          <span aria-hidden="true" className="mt-8 block h-px w-full bg-border" />

          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Hang chi so nho phia tren noi dung — cung ngon ngu voi khoi tom tat don. */
export function AccountStats({
  items,
}: {
  items: { label: string; value: string | number; hint: string }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface p-6">
          <dt className="label-micro text-muted-foreground">{item.label}</dt>
          <dd className="num mt-3 font-display text-3xl font-semibold italic text-foreground">
            {item.value}
          </dd>
          <p className="mt-2 text-xs font-light leading-relaxed text-muted-foreground">
            {item.hint}
          </p>
        </div>
      ))}
    </dl>
  );
}
