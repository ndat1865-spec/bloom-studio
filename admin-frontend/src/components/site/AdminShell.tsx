import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronRight,
  ExternalLink,
  Flower2,
  KeyRound,
  LayoutDashboard,
  Mail,
  LogOut,
  Menu,
  MessageSquareText,
  MessagesSquare,
  NotebookPen,
  ShoppingBag,
  Tags,
  TicketPercent,
  UserCog,
  X,
} from "lucide-react";
import { InitialsAvatar } from "@/components/site/InitialsAvatar";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/api";
import { SHOP_APP_URL } from "@/lib/links";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  /** Cac tien to duong dan cung duoc coi la "dang o muc nay" */
  match: (path: string) => boolean;
  /** Chi ADMIN thay muc nay (nhan vien bi an). */
  adminOnly?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Tổng quan",
    items: [
      {
        label: "Bảng điều khiển",
        to: "/admin",
        icon: LayoutDashboard,
        match: (path) => path === "/admin",
      },
    ],
  },
  {
    title: "Bán hàng",
    items: [
      {
        label: "Đơn hàng",
        to: "/admin/orders",
        icon: ShoppingBag,
        // Trang chi tiet /orders/:id van thuoc muc Don hang
        match: (path) => path.startsWith("/admin/orders") || path.startsWith("/orders/"),
      },
      {
        label: "Hộp thư chat",
        to: "/admin/chat",
        icon: MessagesSquare,
        match: (path) => path.startsWith("/admin/chat"),
      },
      {
        label: "Yêu cầu đặt hoa",
        to: "/admin/requests",
        icon: NotebookPen,
        match: (path) => path.startsWith("/admin/requests"),
      },
      {
        label: "Mã giảm giá",
        to: "/admin/vouchers",
        icon: TicketPercent,
        match: (path) => path.startsWith("/admin/vouchers"),
      },
    ],
  },
  {
    title: "Sản phẩm",
    items: [
      {
        label: "Quản lý hoa",
        to: "/admin/products",
        icon: Flower2,
        match: (path) => path.startsWith("/admin/products"),
      },
      {
        label: "Danh mục",
        to: "/admin/categories",
        icon: Tags,
        match: (path) => path.startsWith("/admin/categories"),
      },
      {
        label: "Đánh giá",
        to: "/admin/reviews",
        icon: MessageSquareText,
        match: (path) => path.startsWith("/admin/reviews"),
      },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      {
        label: "Khoá API đối tác",
        to: "/admin/api-keys",
        icon: KeyRound,
        match: (path) => path.startsWith("/admin/api-keys"),
        adminOnly: true,
      },
      {
        label: "Nhân viên",
        to: "/admin/staff",
        icon: UserCog,
        match: (path) => path.startsWith("/admin/staff"),
        adminOnly: true,
      },
      {
        label: "Thông báo",
        to: "/admin/notifications",
        icon: Mail,
        match: (path) => path.startsWith("/admin/notifications"),
      },
    ],
  },
];

/** Ten trang cho breadcrumb o thanh tren, lay theo muc menu dang chon. */
function currentTitle(path: string): { section: string; page: string } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.match(path)) {
        if (path.startsWith("/orders/")) return { section: item.label, page: "Chi tiết đơn" };
        return { section: group.title, page: item.label };
      }
    }
  }
  return null;
}

function Brand() {
  return (
    <Link
      to="/admin"
      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1 transition-colors hover:bg-surface-hover"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-background"
      >
        <Flower2 className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold italic text-foreground">
          Bloom Studio
        </span>
        <span className="block text-[0.6875rem] text-subtle-foreground">Bảng quản trị</span>
      </span>
    </Link>
  );
}

/** Noi dung sidebar — dung chung cho ban co dinh (desktop) va ngan keo (mobile). */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const name = user?.displayName || user?.fullName || user?.username;
  // Nhan vien khong thay Khoa API va Nhan vien
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isAdmin || !item.adminOnly),
  })).filter((group) => group.items.length > 0);

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-3">
        <Brand />
      </div>

      <nav aria-label="Điều hướng quản trị" className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="label-micro px-3 pb-1.5 text-subtle-foreground">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.match(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[0.8125rem] transition-colors",
                        active
                          ? "bg-accent-soft font-medium text-foreground"
                          : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                      )}
                    >
                      {/* Vach nho ben trai danh dau muc dang chon */}
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
                        />
                      ) : null}
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "size-4 shrink-0",
                          active ? "text-accent" : "text-subtle-foreground group-hover:text-foreground",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="border-t border-border pt-4">
          <a
            href={SHOP_APP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <ExternalLink aria-hidden="true" className="size-4 text-subtle-foreground" />
            Xem cửa hàng
            <span className="sr-only">(mở tab mới)</span>
          </a>
        </div>
      </nav>

      {/* O tai khoan o day sidebar */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2">
          <InitialsAvatar name={name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium text-foreground">{name}</p>
            <p className="text-xs text-subtle-foreground">{ROLE_LABELS[user?.role ?? "ADMIN"]}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span className="sr-only">Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Khung app quan tri: sidebar co dinh ben trai (tu lg), thanh tren co breadcrumb.
 * Duoi lg sidebar thanh ngan keo, mo bang nut menu — Radix Dialog lo focus trap va Esc.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const title = currentTitle(pathname);

  // Doi trang thi dong ngan keo (phong khi dieu huong bang nut Back)
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="min-h-svh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-background/70 backdrop-blur-[2px] lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-border bg-sidebar shadow-[var(--shadow-pop)] focus:outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menu quản trị</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Chọn trang quản trị cần mở
            </DialogPrimitive.Description>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            <DialogPrimitive.Close className="absolute right-3 top-4 inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-surface-hover hover:text-foreground">
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Đóng menu</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="shell flex h-14 items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="-ml-1 inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Mở menu</span>
          </button>

          {title ? (
            <nav aria-label="Vị trí hiện tại" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-[0.8125rem]">
                <li className="hidden text-subtle-foreground sm:block">Quản trị</li>
                <li aria-hidden="true" className="hidden text-subtle-foreground sm:block">
                  <ChevronRight className="size-3.5" />
                </li>
                <li className="truncate text-subtle-foreground">{title.section}</li>
                <li aria-hidden="true" className="text-subtle-foreground">
                  <ChevronRight className="size-3.5" />
                </li>
                <li aria-current="page" className="truncate font-medium text-foreground">
                  {title.page}
                </li>
              </ol>
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <span className="num hidden text-xs text-subtle-foreground md:inline">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

/**
 * Tieu de trang chuan: ten trang + mo ta ngan ben trai, nut thao tac ben phai.
 * Dung o moi trang de cac trang quan tri co cung mot nhip.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl text-foreground">{title}</h1>
        {description ? (
          <p className="prose-measure mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
