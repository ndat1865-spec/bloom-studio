import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { CartIndicator } from "@/components/shop/CartIndicator";
import { AccountMenu } from "@/components/site/AccountMenu";
import { InitialsAvatar } from "@/components/site/InitialsAvatar";
import { ADMIN_APP_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

// Nhan tieng Viet dai hon ban tieng Anh cu: giu it muc de thanh menu khong xuong dong o 1024px
const SECTION_LINKS = [
  { label: "Theo dịp", href: "/#occasions" },
  { label: "Hoa cưới", href: "/#weddings" },
  { label: "Cách đặt", href: "/#process" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Dong menu khi doi trang
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  // Esc dong menu + khoa cuon nen khi menu mo
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Menu quan tri nam o admin-frontend; ADMIN chi thay mot link sang do trong menu tai khoan
  const appLinks = [
    { label: "Mẫu hoa", to: "/products" },
    { label: "Theo yêu cầu", to: "/dat-hoa-theo-yeu-cau" },
    { label: "Voucher", to: "/voucher" },
  ];

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-[12px]">
      <div className="shell flex h-[4.5rem] items-center justify-between gap-6">
        <Link
          to="/"
          className="font-display text-2xl font-bold italic leading-none text-accent transition-colors hover:text-accent-strong"
        >
          Bloom Studio
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-6 lg:flex xl:gap-8">
          {SECTION_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="label-micro whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          {appLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "label-micro whitespace-nowrap transition-colors hover:text-foreground",
                  isActive ? "text-accent" : "text-muted-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <CartIndicator />
          {user ? (
            /* Avatar chu cai + menu tai khoan, thay cho cum chu "username ROLE" cu */
            <AccountMenu onSignOut={handleSignOut} />
          ) : (
            <>
              {/*
                Loi vao /login cho khach chua dang nhap. De dang chu (label-micro) thay vi nut,
                giu "Đặt hoa →" la CTA noi bat duy nhat cua navbar theo DESIGN.md.
              */}
              <Link
                to="/login"
                className="label-micro whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
              >
                Đăng nhập
              </Link>
              <Button variant="outline" size="sm" asChild>
                <Link to="/products">Đặt hoa →</Link>
              </Button>
            </>
          )}
        </div>

        {/* Icon gio hang luon hien tren mobile, canh nut hamburger */}
        <div className="flex items-center gap-1 lg:hidden">
          <CartIndicator />

          <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
          className="-mr-2 inline-flex size-11 items-center justify-center text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          <span className="sr-only">{open ? "Đóng menu" : "Mở menu"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="border-t border-border bg-background lg:hidden"
          >
            <nav aria-label="Điều hướng di động" className="shell flex flex-col gap-1 py-6">
              {SECTION_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="label-micro py-3.5 text-muted-foreground transition-colors hover:text-accent"
                >
                  {link.label}
                </a>
              ))}
              <span className="my-2 h-px w-full bg-border" aria-hidden="true" />
              {appLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="label-micro py-3.5 text-foreground transition-colors hover:text-accent"
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="mt-4">
                {user ? (
                  <>
                    {/* Cung cac muc voi menu avatar ban desktop */}
                    <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
                      <InitialsAvatar
                        name={user.displayName || user.fullName || user.username}
                        src={user.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          {user.displayName || user.fullName || user.username}
                        </p>
                        <p className="label-micro mt-1 text-accent">
                          {user.role === "ADMIN" ? "Quản trị viên" : user.role === "STAFF" ? "Nhân viên" : "Khách hàng"}
                        </p>
                      </div>
                    </div>

                    {user.role === "ADMIN" || user.role === "STAFF" ? (
                      <a
                        href={ADMIN_APP_URL}
                        className="label-micro block py-3.5 text-foreground transition-colors hover:text-accent"
                      >
                        Trang quản trị ↗
                      </a>
                    ) : null}
                    <NavLink
                      to="/tai-khoan"
                      className="label-micro block py-3.5 text-foreground transition-colors hover:text-accent"
                    >
                      Thông tin cá nhân
                    </NavLink>
                    <NavLink
                      to="/tai-khoan/dia-chi"
                      className="label-micro block py-3.5 text-foreground transition-colors hover:text-accent"
                    >
                      Sổ địa chỉ
                    </NavLink>
                    <NavLink
                      to="/tai-khoan/don-hang"
                      className="label-micro block py-3.5 text-foreground transition-colors hover:text-accent"
                    >
                      Đơn hàng của tôi
                    </NavLink>

                    <Button
                      variant="ghost"
                      size="md"
                      className="mt-4 w-full"
                      onClick={handleSignOut}
                    >
                      <LogOut aria-hidden="true" />
                      Đăng xuất
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" size="md" className="w-full" asChild>
                      <Link to="/login">Đăng nhập</Link>
                    </Button>
                    <Button variant="ghost" size="md" className="w-full" asChild>
                      <Link to="/register">Đăng ký</Link>
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
