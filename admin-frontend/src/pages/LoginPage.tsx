import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { AuthLayout } from "@/components/site/AuthLayout";
import { useAuth } from "@/context/AuthContext";
import { ApiError, BACKOFFICE_ROLES, NetworkError, api, TOKEN_KEY, clearStoredAuth } from "@/lib/api";
import { SHOP_APP_URL } from "@/lib/links";

/**
 * Dang nhap cua app quan tri. Nhan ADMIN va nhan vien (STAFF): CUSTOMER dang nhap dung
 * mat khau van bi tu choi o day va duoc chi sang giao dien khach hang.
 * Day chi la trai nghiem - quyen that van do backend kiem tra trong JWT.
 * Khong gia lap thanh cong o frontend: chi dieu huong khi backend tra 200.
 */
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  // Da dang nhap roi thi khong o lai trang login
  useEffect(() => {
    if (user && BACKOFFICE_ROLES.includes(user.role)) navigate("/admin", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: typeof errors = {};
    if (!username.trim()) nextErrors.username = "Nhập tên đăng nhập.";
    if (!password) nextErrors.password = "Nhập mật khẩu.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      // Hai buoc: lay token truoc, roi moi lay ho so.
      // auth-service khong tra ca ho so kem token nhu ban monolith - token chi
      // mang username, userId va role; ho so lay rieng bang GET /auth/me.
      const session = await api.login(username.trim(), password);
      if (!BACKOFFICE_ROLES.includes(session.role)) {
        // Khong giu lai token cua CUSTOMER trong app quan tri
        clearStoredAuth();
        setFormError("Tài khoản này không có quyền quản trị. Hãy dùng giao diện khách hàng.");
        return;
      }
      localStorage.setItem(TOKEN_KEY, session.token);
      const profile = await api.getMe();
      signIn(session.token, profile);
      navigate("/admin", { replace: true });
    } catch (error) {
      if (error instanceof NetworkError) {
        setFormError(error.message);
      } else if (error instanceof ApiError && error.status === 401) {
        setFormError("Sai tên đăng nhập hoặc mật khẩu.");
      } else if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Đã xảy ra lỗi không xác định.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập quản trị"
      intro="Dùng tài khoản quản trị viên để vào bảng điều khiển."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Là khách hàng?{" "}
          <a
            href={SHOP_APP_URL}
            className="text-accent underline-offset-4 transition-colors hover:text-accent-strong hover:underline"
          >
            Sang cửa hàng
          </a>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? <Notice tone="error">{formError}</Notice> : null}

        <Field id="username" label="Tên đăng nhập" error={errors.username} required>
          {(props) => (
            <Input
              {...props}
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
            />
          )}
        </Field>

        <Field id="password" label="Mật khẩu" error={errors.password} required>
          {(props) => (
            <Input
              {...props}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ít nhất 6 ký tự"
            />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Đang đăng nhập…
            </>
          ) : (
            "Đăng nhập"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
