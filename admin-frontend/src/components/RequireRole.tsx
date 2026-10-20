import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/api";

/**
 * Chan truy cap trai role o phia giao dien.
 *
 * LUU Y: day chi la trai nghiem nguoi dung, KHONG phai bao mat.
 * Backend van tu kiem tra role trong JWT o tung service.
 *
 * - Chua dang nhap (hoac la CUSTOMER) -> ve /login (LoginPage tu choi CUSTOMER).
 * - Da dang nhap nhung khong du quyen (nhan vien mo trang chi danh cho ADMIN, vd. Khoa API)
 *   -> ve Bang dieu khien, khong da ra trang dang nhap.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: readonly Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role === "CUSTOMER") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/admin" replace state={{ forbidden: location.pathname }} />;
  }
  return <>{children}</>;
}
