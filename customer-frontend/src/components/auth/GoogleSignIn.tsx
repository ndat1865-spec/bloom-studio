import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Notice } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { ApiError, NetworkError, TOKEN_KEY, api } from "@/lib/api";

/**
 * Khoi "hoac" + nut Google o trang Dang nhap / Dang ky.
 * Dang nhap bang Google luon ra tai khoan KHACH (backend tu tao neu chua co).
 * Backend chua bat Google thi ca khoi bien mat, trang chi con form mat khau.
 */
export function GoogleSignIn({ text }: { text: "signin_with" | "signup_with" }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCredential(credential: string) {
    setBusy(true);
    setError(null);
    try {
      // Cung hai buoc nhu dang nhap mat khau: JWT cua Bloom truoc, ho so sau
      const session = await api.googleLogin(credential);
      localStorage.setItem(TOKEN_KEY, session.token);
      const profile = await api.getMe();
      signIn(session.token, profile);
      navigate("/products", { replace: true });
    } catch (err) {
      if (err instanceof NetworkError || err instanceof ApiError) setError(err.message);
      else setError("Không đăng nhập được bằng Google.");
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-light text-muted-foreground">hoặc</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {error ? (
        <Notice tone="error" className="mt-5">
          {error}
        </Notice>
      ) : null}
      <GoogleButton
        className="mt-5"
        text={text}
        busy={busy}
        onCredential={(credential) => void handleCredential(credential)}
        onError={setError}
        onAvailable={setAvailable}
      />
    </div>
  );
}
