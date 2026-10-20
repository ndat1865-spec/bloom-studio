import { api } from "./api";

/**
 * Dang nhap bang Google qua Google Identity Services (GIS).
 *
 * GIS ve nut "Dang nhap bang Google" trong iframe cua Google; nguoi dung chon tai khoan
 * xong, GIS goi callback voi `credential` = ID token (JWT do Google ky). Frontend chi
 * chuyen token do cho auth-service — backend moi la noi kiem chu ky, aud, han.
 * Client ID lay tu backend (GET /auth/google/config) nen chi khai mot cho trong .env.
 */

type CredentialResponse = { credential: string };

type GoogleButtonOptions = {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
};

type GoogleAccountsId = {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  disableAutoSelect(): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise: Promise<GoogleAccountsId> | null = null;
let configPromise: Promise<string | null> | null = null;

/** Client ID neu backend bat dang nhap Google, null neu tat (hoac backend khong tra loi). */
export function googleClientId(): Promise<string | null> {
  if (!configPromise) {
    configPromise = api
      .getGoogleConfig()
      .then((config) => (config.enabled && config.clientId ? config.clientId : null))
      .catch(() => {
        // Loi mang: lan sau thu lai, khong nho ket qua hong
        configPromise = null;
        return null;
      });
  }
  return configPromise;
}

/** Nap script GIS mot lan cho ca ung dung. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const id = window.google?.accounts?.id;
        if (id) resolve(id);
        else reject(new Error("Không tải được Google Sign-In."));
      };
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error("Không tải được Google Sign-In. Kiểm tra kết nối mạng."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Dang xuat thi tat tu chon tai khoan, de lan sau Google hoi lai chon tai khoan nao. */
export function forgetGoogleSelection() {
  window.google?.accounts?.id?.disableAutoSelect();
}
