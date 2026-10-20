import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Chan truy cap khi CHUA dang nhap, khong phan biet role.
 * Dung cho khu vuc /tai-khoan — ca ADMIN lan CUSTOMER deu co ho so rieng.
 *
 * LUU Y: day chi la trai nghiem nguoi dung, KHONG phai bao mat.
 * Backend van tu kiem tra JWT o tung service.
 *
 * Cac trang quan tri nam o admin-frontend nen app nay khong con chan theo role.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
