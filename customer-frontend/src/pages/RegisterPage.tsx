import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/feedback";
import { AuthLayout } from "@/components/site/AuthLayout";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { useAuth } from "@/context/AuthContext";
import { ApiError, NetworkError, api, TOKEN_KEY } from "@/lib/api";

type Errors = { username?: string; password?: string; confirm?: string };

/**
 * SOS08 — phan TU NGHIEN CUU: "Chuc nang Dang ky, Dang xuat sinh vien co the tu nghien cuu thuc hien".
 *
 * Goi POST /api2025/users/register — endpoint nay LUON tao tai khoan CUSTOMER.
 * Dang ky thanh cong thi dang nhap luon va chuyen toi /products.
 */
export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/products", { replace: true });
  }, [user, navigate]);

  function validate(): boolean {
    const next: Errors = {};
    const name = username.trim();

    if (!name) next.username = "Nhập tên đăng nhập.";
    else if (name.length < 3) next.username = "Tên đăng nhập cần ít nhất 3 ký tự.";
    else if (name.length > 100) next.username = "Tên đăng nhập tối đa 100 ký tự.";

    if (!password) next.password = "Nhập mật khẩu.";
    else if (password.length < 6) next.password = "Mật khẩu cần ít nhất 6 ký tự.";

    if (!confirm) next.confirm = "Nhập lại mật khẩu.";
    else if (confirm !== password) next.confirm = "Mật khẩu nhập lại không khớp.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.register(username.trim(), password);
      // Dang ky xong dang nhap luon — tai khoan moi luon la CUSTOMER.
      // Phai goi login that de lay JWT: endpoint dang ky chi tao tai khoan,
      // khong cap token (tranh bien no thanh mot duong cap token thu hai).
      const session = await api.login(username.trim(), password);
      localStorage.setItem(TOKEN_KEY, session.token);
      const profile = await api.getMe();
      signIn(session.token, profile);
      navigate("/products", { replace: true });
    } catch (error) {
      if (error instanceof NetworkError) {
        setFormError(error.message);
      } else if (error instanceof ApiError && error.status === 409) {
        // Gan loi vao dung o Ten dang nhap thay vi bao loi chung chung
        setErrors((previous) => ({ ...previous, username: "Tên đăng nhập này đã có người dùng." }));
      } else if (error instanceof ApiError) {
        if (error.fieldErrors) setErrors((previous) => ({ ...previous, ...error.fieldErrors }));
        else setFormError(error.message);
      } else {
        setFormError("Đã xảy ra lỗi không xác định.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Bloom Studio · Tạo tài khoản"
      title="Create Account"
      intro="Tạo tài khoản khách hàng để xem danh mục hoa của studio."
      footer={
        <p className="text-sm font-light text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-accent underline-offset-4 transition-colors hover:text-accent-strong hover:underline"
          >
            Đăng nhập
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
              maxLength={100}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="hoalan"
            />
          )}
        </Field>

        <Field id="password" label="Mật khẩu" error={errors.password} required>
          {(props) => (
            <Input
              {...props}
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ít nhất 6 ký tự"
            />
          )}
        </Field>

        <Field id="confirm" label="Nhập lại mật khẩu" error={errors.confirm} required>
          {(props) => (
            <Input
              {...props}
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Nhập lại mật khẩu ở trên"
            />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Đang tạo tài khoản…
            </>
          ) : (
            "Tạo tài khoản →"
          )}
        </Button>
      </form>

      <GoogleSignIn text="signup_with" />
    </AuthLayout>
  );
}
