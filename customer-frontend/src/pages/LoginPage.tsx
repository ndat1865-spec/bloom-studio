import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { AuthLayout } from "@/components/site/AuthLayout";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { useAuth } from "@/context/AuthContext";
import { ApiError, NetworkError, api, TOKEN_KEY } from "@/lib/api";

/**
 * SOS08/SOS09 — dang nhap bang tai khoan co trong MySQL.
 * Sau khi dang nhap -> /products. Trang quan tri nam o admin-frontend (cong 5174),
 * ADMIN dang nhap o day van mua hang duoc nhu khach binh thuong.
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
  const location = useLocation();
  // Trang dang xem truoc khi bi dua sang dang nhap (RequireAuth, nut Luu ma...). Chi nhan
  // duong dan noi bo bat dau bang mot dau "/" - khong de state day khach sang trang ngoai.
  const from = (location.state as { from?: unknown } | null)?.from;
  const redirectTo = typeof from === "string" && /^\/(?!\/)/.test(from) ? from : "/products";

  // Da dang nhap roi thi khong o lai trang login
  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

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
      localStorage.setItem(TOKEN_KEY, session.token);
      const profile = await api.getMe();
      signIn(session.token, profile);
      navigate(redirectTo, { replace: true });
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
      eyebrow="Bloom Studio · Khách hàng"
      title="Welcome Back"
      intro="Hôm nay là một ngày mới. Đăng nhập để đặt hoa và theo dõi đơn hàng của bạn."
      footer={
        <p className="text-sm font-light text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-accent underline-offset-4 transition-colors hover:text-accent-strong hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {formError ? <Notice tone="error">{formError}</Notice> : null}

        <Field id="username" label="Tên đăng nhập" error={errors.username} required>
          {(props) => (
            <Input
              {...props}
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="customer"
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
            "Đăng nhập →"
          )}
        </Button>
      </form>

      <GoogleSignIn text="signin_with" />
    </AuthLayout>
  );
}
