import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Flower2, Loader2, MessageCircle, SendHorizontal, UserRound, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api, type ChatConversation, type ChatMessage, type ChatQuickReply } from "@/lib/api";
import { FALLBACK_IMAGE, formatPrice, resolveImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChatText } from "./ChatText";

/** Hoi tin moi: nhanh khi khung chat dang mo, thua khi dong (chi de hien so tin chua doc). */
const POLL_OPEN_MS = 2500;
const POLL_CLOSED_MS = 20000;

/** Menu mo dau - cung ma lenh voi nut cua tro ly tu dong (ScriptedBot o chat-service). */
const MENU: ChatQuickReply[] = [
  { label: "Tìm hoa theo dịp", action: "find" },
  { label: "Hôm nay còn giao kịp?", action: "delivery" },
  { label: "Đơn của tôi", action: "orders" },
  { label: "Câu hỏi thường gặp", action: "faq" },
  { label: "Gặp nhân viên", action: "staff" },
];

function statusLine(conversation: ChatConversation | null, aiEnabled: boolean): string {
  if (!conversation || conversation.status === "CLOSED" || conversation.status === "AI") {
    return aiEnabled ? "Trợ lý AI trả lời ngay · cần thì gặp nhân viên" : "Trợ lý tự động trả lời ngay · cần thì gặp nhân viên";
  }
  if (conversation.status === "WITH_STAFF") return `${conversation.assignedStaff ?? "Nhân viên"} đang trả lời bạn`;
  return conversation.statusLabel;
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Khung chat noi o goc phai duoi moi trang cua cua hang.
 *
 * Tin cua khach gui qua chat-service; cau tra loi (AI hoac nhan vien) den qua lan hoi dinh ky
 * GET /api/chat/me?afterId=... - khong can WebSocket, di qua Gateway nhu moi API khac.
 */
export function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const lastIdRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userId = user?.id ?? null;

  /** Gop tin moi vao danh sach, bo trung (tin vua gui co the ve lai qua lan hoi). */
  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const next = [...current, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id);
      lastIdRef.current = next.length ? next[next.length - 1].id : lastIdRef.current;
      return next;
    });
  }, []);

  // Doi tai khoan / dang xuat: xoa sach, khong de lo chat cua nguoi truoc
  useEffect(() => {
    setConversation(null);
    setMessages([]);
    setLoaded(false);
    setUnread(0);
    lastIdRef.current = null;
  }, [userId]);

  // Hoi dinh ky
  useEffect(() => {
    if (userId == null) return;
    let cancelled = false;
    let timer: number | undefined;
    const controller = new AbortController();

    const tick = async () => {
      try {
        const snap = await api.getMyChat(lastIdRef.current, controller.signal);
        if (cancelled) return;
        setAiEnabled(snap.aiEnabled);
        // Cuoc chat moi (studio da dong cuoc cu): tai lai tu dau
        if (snap.conversation && conversation && snap.conversation.id !== conversation.id) {
          setMessages([]);
          lastIdRef.current = null;
        }
        setConversation(snap.conversation);
        merge(snap.messages);
        setUnread(open ? 0 : (snap.conversation?.unreadForCustomer ?? 0));
        setLoaded(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Mat mang tam thoi: im lang, lan sau hoi lai
      }
      if (!cancelled) timer = window.setTimeout(tick, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
    // conversation?.id: doi cuoc chat thi khoi dong lai vong hoi voi moc moi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, open, conversation?.id, merge]);

  // Cuon xuong tin moi nhat
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, conversation?.aiPending, open]);

  // Esc dong khung chat; mo ra thi dat con tro vao o nhap
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /** Gui tin. action: ma lenh khi khach bam nut tra loi nhanh; label cua nut la noi dung tin. */
  async function send(text: string, action?: string) {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const snap = await api.sendChat(content, action);
      if (!action) setDraft("");
      if (snap.conversation && conversation && snap.conversation.id !== conversation.id) {
        setMessages([]);
        lastIdRef.current = null;
      }
      setConversation(snap.conversation);
      merge(snap.messages);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Không gửi được tin nhắn.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function askStaff() {
    setError(null);
    try {
      const snap = await api.requestChatStaff();
      setConversation(snap.conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không chuyển được cho nhân viên.");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  }

  // Trang thanh toan cua cong / ket qua thanh toan: khong chen khung chat
  if (location.pathname.startsWith("/payment")) return null;

  const closedChat = conversation?.status === "CLOSED";
  const showMenu = loaded && (messages.length === 0 || closedChat);
  const canAskStaff = conversation?.status === "AI";
  // Nut tra loi nhanh chi hien duoi tin CUOI cua tro ly, khi tro ly con dang phu trach
  const lastMessage = messages[messages.length - 1];
  const quickReplies =
    conversation?.status === "AI" && lastMessage?.senderType === "AI" ? (lastMessage.quickReplies ?? []) : [];

  return (
    <>
      {/* ---------- Nut mo ---------- */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="bloom-chat"
        className={cn(
          "fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-background",
          "shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-[transform,background-color] duration-200 hover:bg-accent-strong active:scale-95",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          open && "max-sm:hidden",
        )}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <MessageCircle className="size-5" aria-hidden="true" />}
        <span className="max-sm:sr-only">{open ? "Đóng chat" : "Hỏi thợ hoa"}</span>
        {!open && unread > 0 ? (
          <span className="num absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
            {unread}
            <span className="sr-only"> tin chưa đọc</span>
          </span>
        ) : null}
      </button>

      {/* ---------- Khung chat ---------- */}
      {open ? (
        <section
          id="bloom-chat"
          aria-label="Chat với Bloom Studio"
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-border-strong/60 bg-background shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
            "inset-0 sm:inset-auto sm:bottom-20 sm:right-5 sm:h-[min(36rem,calc(100svh-7rem))] sm:w-[23rem]",
          )}
        >
          <header className="flex items-start gap-3 border-b border-border bg-surface px-4 py-3.5">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Flower2 className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-semibold italic leading-tight text-foreground">Bloom Studio</p>
              <p className="truncate text-xs font-light text-muted-foreground">{statusLine(conversation, aiEnabled)}</p>
            </div>
            {canAskStaff ? (
              <button
                type="button"
                onClick={() => void askStaff()}
                className="inline-flex shrink-0 items-center gap-1.5 border border-border-strong px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <UserRound className="size-3.5" aria-hidden="true" />
                Gặp nhân viên
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Đóng chat</span>
            </button>
          </header>

          {user ? (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
                {!loaded ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Đang tải…
                  </p>
                ) : null}

                {messages.map((m) =>
                  m.senderType === "SYSTEM" ? (
                    <p key={m.id} className="mx-auto max-w-[85%] text-center text-xs font-light text-muted-foreground">
                      {m.content}
                    </p>
                  ) : m.senderType === "CUSTOMER" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[82%] bg-accent/20 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                        <ChatText text={m.content} />
                        <span className="num mt-1 block text-right text-[10px] text-muted-foreground">
                          {timeOf(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex flex-col items-start">
                      <span className="mb-1 text-[11px] text-muted-foreground">
                        {m.senderName ?? (m.senderType === "AI" ? "Trợ lý Bloom" : "Nhân viên")}
                        {m.senderType === "STAFF" ? " · Bloom Studio" : ""}
                      </span>
                      <div
                        className={cn(
                          "max-w-[88%] px-3.5 py-2.5 text-sm leading-relaxed text-foreground",
                          m.senderType === "STAFF" ? "border border-accent/40 bg-surface" : "bg-surface-raised",
                        )}
                      >
                        <ChatText text={m.content} onNavigate={() => setOpen(window.innerWidth >= 640)} />
                        <span className="num mt-1 block text-[10px] text-muted-foreground">{timeOf(m.createdAt)}</span>
                      </div>

                      {/* The bo hoa tro ly goi y: anh + gia tu co nho nhat, bam de xem va dat */}
                      {m.cards?.length ? (
                        <ul className="mt-2 w-full space-y-2">
                          {m.cards.map((card) => (
                            <li key={card.id}>
                              <Link
                                to={card.link}
                                onClick={() => setOpen(window.innerWidth >= 640)}
                                className="group flex items-center gap-3 border border-border bg-surface p-2 transition-colors hover:border-accent"
                              >
                                <img
                                  src={resolveImageUrl(card.imageUrl)}
                                  alt=""
                                  loading="lazy"
                                  onError={(event) => {
                                    const img = event.currentTarget;
                                    if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
                                  }}
                                  className="size-14 shrink-0 object-cover"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-display text-base font-semibold italic text-foreground group-hover:text-accent">
                                    {card.name}
                                  </span>
                                  <span className="num block text-xs text-muted-foreground">
                                    {card.sizeCount > 1 ? "Từ " : ""}
                                    {formatPrice(card.priceFrom)}
                                    {card.sizeCount > 1 ? ` · ${card.sizeCount} cỡ` : ""}
                                    {card.stems ? ` · ${card.stems} bông` : ""}
                                  </span>
                                  <span className="block text-[11px] text-accent">
                                    {card.leadDays > 0 ? `Đặt trước ${card.leadDays} ngày` : "Giao trong ngày"}
                                  </span>
                                </span>
                                <span aria-hidden="true" className="pr-1 text-accent">
                                  →
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ),
                )}

                {quickReplies.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {quickReplies.map((q) => (
                      <button
                        key={q.action + q.label}
                        type="button"
                        disabled={sending}
                        onClick={() => void send(q.label, q.action)}
                        className="rounded-full border border-accent/50 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:bg-accent/10 disabled:opacity-50"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {conversation?.aiPending && conversation.status === "AI" ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex gap-1" aria-hidden="true">
                      <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.1s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-accent" />
                    </span>
                    Trợ lý đang soạn…
                  </p>
                ) : null}

                {showMenu ? (
                  <div className="space-y-3 pt-1">
                    {messages.length === 0 ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Chào {user.displayName || user.fullName || user.username}! Mình là trợ lý của Bloom Studio.
                        Chọn một mục bên dưới, hoặc gõ câu hỏi — ví dụ “hoa sinh nhật tầm 500k”.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {MENU.map((q) => (
                        <button
                          key={q.action}
                          type="button"
                          disabled={sending}
                          onClick={() => void send(q.label, q.action)}
                          className="rounded-full border border-accent/50 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent hover:bg-accent/10 disabled:opacity-50"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <form onSubmit={onSubmit} className="border-t border-border bg-surface px-3 py-3">
                {error ? <p className="mb-2 text-xs text-danger">{error}</p> : null}
                <div className="flex items-end gap-2">
                  <label htmlFor="bloom-chat-input" className="sr-only">
                    Tin nhắn
                  </label>
                  <textarea
                    id="bloom-chat-input"
                    ref={inputRef}
                    rows={1}
                    maxLength={1000}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={closedChat ? "Nhắn để bắt đầu cuộc trò chuyện mới" : "Nhập tin nhắn…"}
                    className="max-h-28 min-h-10 flex-1 resize-none border border-border-strong bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex size-10 shrink-0 items-center justify-center bg-accent text-background transition-colors hover:bg-accent-strong disabled:opacity-40"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <SendHorizontal className="size-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">Gửi</span>
                  </button>
                </div>
                <p className="mt-2 text-[10px] font-light text-muted-foreground">
                  {aiEnabled
                    ? "Trợ lý AI có thể nhầm — giá và giờ giao cuối cùng xem ở trang đặt hoa."
                    : "Enter để gửi · giá và giờ giao lấy trực tiếp từ hệ thống của studio."}
                </p>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center gap-4 px-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Đăng nhập để chat với studio — tư vấn chọn hoa, hỏi giờ giao, theo dõi đơn của bạn.
              </p>
              <Link
                to="/login"
                state={{ from: location.pathname }}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center bg-accent px-5 text-sm text-background hover:bg-accent-strong"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
