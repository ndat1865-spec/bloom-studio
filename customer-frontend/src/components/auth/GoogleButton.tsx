import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { googleClientId, loadGoogleIdentity } from "@/lib/google";
import { cn } from "@/lib/utils";

const LABELS = {
  signin_with: "Đăng nhập bằng Google",
  signup_with: "Đăng ký bằng Google",
  continue_with: "Tiếp tục với Google",
} as const;

/**
 * Nut "Dang nhap bang Google" theo giao dien Bloom.
 *
 * Nut that cua Google la iframe (khong doi duoc mau, font, do rong). Cach lam: ve nut rieng
 * theo phong cach cua site, roi dat nut that cua Google TRONG SUOT phu dung len tren, keo
 * gian cho vua khit. Khach bam trung nut that -> van la luong ID token chinh chu cua Google,
 * backend khong doi. Hover / focus cua iframe van lam doi mau nut ve (group-hover,
 * group-focus-within) vi :hover, :focus-within ap dung cho phan tu cha cua iframe.
 *
 * Backend chua bat (thieu GOOGLE_CLIENT_ID) thi khong ve gi - goi onAvailable(false).
 */
export function GoogleButton({
  text = "continue_with",
  busy = false,
  onCredential,
  onError,
  onAvailable,
  className,
}: {
  text?: keyof typeof LABELS;
  busy?: boolean;
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  onAvailable?: (available: boolean) => void;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "off">("loading");

  // Callback moi nhat, khong phai ve lai nut moi lan component render
  const callbacks = useRef({ onCredential, onError, onAvailable });
  callbacks.current = { onCredential, onError, onAvailable };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clientId = await googleClientId();
      if (cancelled) return;
      if (!clientId) {
        setState("off");
        callbacks.current.onAvailable?.(false);
        return;
      }
      try {
        const gis = await loadGoogleIdentity();
        if (cancelled || !holder.current || !frame.current) return;
        gis.initialize({
          client_id: clientId,
          callback: (response) => callbacks.current.onCredential(response.credential),
          cancel_on_tap_outside: true,
        });
        holder.current.replaceChildren();
        gis.renderButton(holder.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text,
          shape: "rectangular",
          // GIS nhan chieu rong co dinh (px, toi da 400); phan con lai do scale ben duoi lo
          width: Math.min(400, Math.max(200, Math.round(frame.current.clientWidth))),
          locale: "vi",
        });
        setState("ready");
        callbacks.current.onAvailable?.(true);
      } catch (error) {
        if (cancelled) return;
        setState("off");
        callbacks.current.onAvailable?.(false);
        callbacks.current.onError?.(error instanceof Error ? error.message : "Không tải được Google Sign-In.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  // Keo gian nut that cua Google cho phu kin nut ve (ke ca khi khung rong hon 400px)
  useEffect(() => {
    if (state !== "ready" || !holder.current || !frame.current) return;
    const target = holder.current;
    const box = frame.current;
    const fit = () => {
      const w = target.offsetWidth;
      const h = target.offsetHeight;
      if (!w || !h) return;
      target.style.transform = `scale(${box.clientWidth / w}, ${box.clientHeight / h})`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(target);
    observer.observe(box);
    fit();
    return () => observer.disconnect();
  }, [state]);

  if (state === "off") return null;

  const loading = state === "loading";

  return (
    <div ref={frame} className={cn("group relative h-12 w-full", className)}>
      {/* Nut ve: chi de nhin, moi cu bam roi vao iframe cua Google phu phia tren */}
      <div
        aria-hidden="true"
        className={cn(
          "flex h-full w-full items-center justify-center gap-3 border border-border-strong px-5",
          "font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-foreground",
          "transition-colors duration-200",
          "group-hover:border-accent group-hover:bg-accent/10",
          "group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-ring",
          (loading || busy) && "text-muted-foreground",
        )}
      >
        {loading || busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleMark className="size-[18px] shrink-0" />
        )}
        {loading ? "Đang tải Google…" : busy ? "Đang xác thực…" : LABELS[text]}
      </div>

      {/* Nut that cua Google: trong suot, phu khit len nut ve */}
      <div
        ref={holder}
        className={cn(
          "absolute left-0 top-0 origin-top-left opacity-0",
          (loading || busy) && "pointer-events-none",
        )}
      />
    </div>
  );
}

/** Logo "G" nhieu mau cua Google - giu nguyen mau theo quy dinh thuong hieu cua Google. */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
