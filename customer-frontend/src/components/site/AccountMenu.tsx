import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { LayoutDashboard, LogOut, MapPin, Package, UserRound } from "lucide-react";
import {
  AVATAR_ACTIVE,
  AVATAR_HOVER,
  AvatarGlow,
  InitialsAvatar,
} from "@/components/site/InitialsAvatar";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_APP_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

/**
 * Nut avatar tren navbar + menu tai khoan.
 *
 * Thay cho cum chu "customer CUSTOMER" cu.
 * Menu dung <button> + danh sach link thuong, khong keo them thu vien dropdown nao:
 *  - Esc dong menu
 *  - Click ra ngoai dong menu
 *  - Doi trang dong menu
 */
export function AccountMenu({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!user) return null;

  // ADMIN va nhan vien deu co loi sang app quan tri
  const isAdmin = user.role === "ADMIN" || user.role === "STAFF";
  const name = user.displayName || user.fullName || user.username;

  const itemClasses =
    "flex items-center gap-3 px-5 py-3 text-sm font-light text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:bg-surface-raised focus-visible:text-foreground focus-visible:outline-none";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "group relative inline-flex items-center rounded-full p-1",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <AvatarGlow active={open} />

        <InitialsAvatar
          name={name}
          src={user.avatarUrl}
          size="md"
          // Menu dang mo thi giu ve "dang bat", khong phu thuoc chuot con o do hay khong
          className={cn("relative", AVATAR_HOVER, open && AVATAR_ACTIVE)}
        />

        <span className="sr-only">
          {open ? "Đóng" : "Mở"} menu tài khoản của {name}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
        <motion.div
          role="menu"
          aria-label="Tài khoản"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 origin-top border border-border bg-surface py-2 shadow-2xl shadow-black/40"
        >
          {/* Danh tinh: chi de doc, khong phai muc bam duoc */}
          <div className="flex items-center gap-3 border-b border-border px-5 pb-4 pt-3">
            <InitialsAvatar name={name} src={user.avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{name}</p>
              <p className="label-micro mt-1 text-accent">
                {isAdmin ? "Quản trị viên" : "Khách hàng"}
              </p>
            </div>
          </div>

          <div className="pt-1">
            {isAdmin ? (
              // App quan tri o cong khac: phai dang nhap lai ben do
              <a href={ADMIN_APP_URL} role="menuitem" className={itemClasses}>
                <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" />
                Trang quản trị ↗
              </a>
            ) : null}

            <Link to="/tai-khoan" role="menuitem" className={itemClasses}>
              <UserRound className="size-4 shrink-0" aria-hidden="true" />
              Thông tin cá nhân
            </Link>
            <Link to="/tai-khoan/dia-chi" role="menuitem" className={itemClasses}>
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              Sổ địa chỉ
            </Link>
            <Link to="/tai-khoan/don-hang" role="menuitem" className={itemClasses}>
              <Package className="size-4 shrink-0" aria-hidden="true" />
              Đơn hàng của tôi
            </Link>
          </div>

          <div className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              className={cn(itemClasses, "w-full text-left hover:text-danger")}
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              Đăng xuất
            </button>
          </div>
        </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
