import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Bot, CheckCheck, Loader2, MessagesSquare, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Notice } from "@/components/ui/feedback";
import { ChatText } from "@/components/chat/ChatText";
import { PageHeader } from "@/components/site/AdminShell";
import { api, type ChatConversation, type ChatMessage, type ChatStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const LIST_POLL_MS = 5000;
const THREAD_POLL_MS = 3000;

type Summary = { ai: number; waitingStaff: number; withStaff: number; closed: number };

const FILTERS: { key: ChatStatus; label: string; count: (s: Summary) => number }[] = [
  { key: "WAITING_STAFF", label: "Chờ nhân viên", count: (s) => s.waitingStaff },
  { key: "WITH_STAFF", label: "Đang hỗ trợ", count: (s) => s.withStaff },
  { key: "AI", label: "Trợ lý tự động", count: (s) => s.ai },
  { key: "CLOSED", label: "Đã kết thúc", count: (s) => s.closed },
];

const STATUS_TONE: Record<ChatStatus, string> = {
  WAITING_STAFF: "bg-accent/12 text-accent ring-accent/25",
  WITH_STAFF: "bg-info/12 text-info ring-info/25",
  AI: "bg-surface-raised text-muted-foreground ring-border",
  CLOSED: "bg-surface-raised text-subtle-foreground ring-border",
};

function timeOf(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return d.toDateString() === today.toDateString() ? hm : `${hm} ${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Hop thu chat cua studio. Cot trai: cac cuoc chat theo trang thai; cot phai: noi dung va o tra loi.
 * Nhan vien tra loi thi cuoc chat chuyen sang tay nhan vien va tro ly AI dung lai.
 */
export default function AdminChatPage() {
  const [filter, setFilter] = useState<ChatStatus>("WAITING_STAFF");
  const [list, setList] = useState<ChatConversation[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const lastIdRef = useRef<number | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // ---------- danh sach + so dem, hoi dinh ky ----------
  const loadList = useCallback(async (signal?: AbortSignal) => {
    try {
      const [page, counts] = await Promise.all([api.listChats(filter, 0, 50, signal), api.chatSummary(signal)]);
      setList(page.content);
      setSummary(counts);
      setListError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setListError(err instanceof Error ? err.message : "Không tải được hộp thư.");
    }
  }, [filter]);

  useEffect(() => {
    const controller = new AbortController();
    setList(null);
    void loadList(controller.signal);
    const timer = window.setInterval(() => void loadList(controller.signal), LIST_POLL_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loadList]);

  // ---------- cuoc chat dang mo, hoi tin moi dinh ky ----------
  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const next = [...current, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id);
      lastIdRef.current = next.length ? next[next.length - 1].id : null;
      return next;
    });
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    let timer: number | undefined;
    const controller = new AbortController();
    setMessages([]);
    setConversation(null);
    lastIdRef.current = null;

    const tick = async () => {
      try {
        const snap = await api.getChat(selectedId, lastIdRef.current, controller.signal);
        if (cancelled) return;
        setConversation(snap.conversation);
        setAiEnabled(snap.aiEnabled);
        merge(snap.messages);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
      if (!cancelled) timer = window.setTimeout(tick, THREAD_POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [selectedId, merge]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedId]);

  async function act(key: string, action: () => Promise<{ conversation: ChatConversation | null; messages: ChatMessage[] }>, success?: string) {
    setBusy(key);
    setNotice(null);
    try {
      const snap = await action();
      setConversation(snap.conversation);
      merge(snap.messages);
      if (success) setNotice({ tone: "success", text: success });
      void loadList();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Thao tác không thành công." });
    } finally {
      setBusy(null);
    }
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || selectedId == null) return;
    void act("send", async () => {
      const snap = await api.sendStaffChat(selectedId, content);
      setDraft("");
      return snap;
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  const closed = conversation?.status === "CLOSED";

  return (
    <div className="shell page-pad">
      <PageHeader
        title="Hộp thư chat"
        description={
          aiEnabled
            ? "Trợ lý tự động (có AI) trả lời khách trước. Khách bấm Gặp nhân viên hoặc hỏi việc cần người thì cuộc chat vào mục Chờ nhân viên."
            : "Trợ lý tự động trả lời khách theo kịch bản: gợi ý hoa, giờ giao, đơn hàng. Khách bấm Gặp nhân viên hoặc hỏi việc cần người thì cuộc chat vào mục Chờ nhân viên."
        }
      />

      {notice ? (
        <Notice tone={notice.tone} className="mt-5">
          {notice.text}
        </Notice>
      ) : null}

      {/*
        Man rong: khung chat cao het phan con lai cua man hinh, chi cot danh sach va phan tin
        nhan tu cuon ben trong. Man hep: hai khoi xep chong, moi khoi co chieu cao rieng.
      */}
      <div className="card mt-6 grid grid-cols-1 overflow-hidden lg:h-[calc(100svh-15rem)] lg:min-h-[32rem] lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* ---------- Cot trai: danh sach ---------- */}
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div role="group" aria-label="Lọc cuộc chat" className="flex flex-wrap gap-1 border-b border-border p-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[0.8125rem] transition-colors",
                  filter === f.key
                    ? "bg-surface-raised font-medium text-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                {summary && f.count(summary) > 0 ? (
                  <span
                    className={cn(
                      "num rounded-full px-1.5 text-[11px]",
                      f.key === "WAITING_STAFF" ? "bg-accent text-background" : "bg-surface-raised text-muted-foreground",
                    )}
                  >
                    {f.count(summary)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto max-lg:max-h-72">
            {listError ? (
              <div className="p-4">
                <ErrorState message={listError} />
              </div>
            ) : list === null ? (
              <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Đang tải…
              </p>
            ) : list.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Không có cuộc chat nào ở mục này.</p>
            ) : (
              <ul>
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      aria-current={selectedId === c.id ? "true" : undefined}
                      className={cn(
                        "block w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-raised/60",
                        selectedId === c.id && "bg-surface-raised",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">@{c.username}</span>
                        <span className="num shrink-0 text-[11px] text-subtle-foreground">{timeOf(c.lastMessageAt)}</span>
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">{c.lastMessagePreview ?? "—"}</span>
                        {c.unreadForStaff > 0 ? (
                          <span className="num inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] text-background">
                            {c.unreadForStaff}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* ---------- Cot phai: noi dung ---------- */}
        <section aria-label="Nội dung cuộc chat" className="flex min-h-[28rem] flex-col lg:min-h-0">
          {selectedId == null ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Chọn một cuộc chat"
                description="Cuộc chat mới cần nhân viên nằm ở mục Chờ nhân viên."
              />
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
                <MessagesSquare className="size-4 text-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">@{conversation?.username ?? "…"}</p>
                  {conversation ? (
                    <span
                      className={cn(
                        "mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                        STATUS_TONE[conversation.status],
                      )}
                    >
                      {conversation.statusLabel}
                      {conversation.assignedStaff ? ` · @${conversation.assignedStaff}` : ""}
                    </span>
                  ) : null}
                </div>
                {conversation && !closed && conversation.status !== "AI" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      void act("ai", () => api.returnChatToAi(selectedId), "Đã trả cuộc chat cho trợ lý tự động.")
                    }
                  >
                    <Bot aria-hidden="true" />
                    Trả lại cho trợ lý
                  </Button>
                ) : null}
                {conversation && !closed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => void act("close", () => api.closeChat(selectedId), "Đã kết thúc cuộc chat.")}
                  >
                    <CheckCheck aria-hidden="true" />
                    Kết thúc
                  </Button>
                ) : null}
              </header>

              <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 max-lg:max-h-[60svh]">
                {messages.map((m) =>
                  m.senderType === "SYSTEM" ? (
                    <p key={m.id} className="text-center text-xs text-subtle-foreground">
                      {m.content} · {timeOf(m.createdAt)}
                    </p>
                  ) : (
                    <div
                      key={m.id}
                      className={cn("flex flex-col", m.senderType === "CUSTOMER" ? "items-start" : "items-end")}
                    >
                      <span className="mb-1 text-[11px] text-subtle-foreground">
                        {m.senderType === "AI" ? (m.senderName ?? "Trợ lý") : m.senderType === "STAFF" ? `@${m.senderName}` : `@${m.senderName} (khách)`}
                        {" · "}
                        {timeOf(m.createdAt)}
                      </span>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm leading-relaxed",
                          m.senderType === "CUSTOMER" && "bg-surface-raised text-foreground",
                          m.senderType === "AI" && "bg-surface text-muted-foreground ring-1 ring-border",
                          m.senderType === "STAFF" && "bg-accent/15 text-foreground",
                        )}
                      >
                        <ChatText text={m.content} />
                        {m.cards?.length ? (
                          <span className="mt-2 block border-t border-border pt-2 text-xs">
                            <span className="text-subtle-foreground">Gợi ý cho khách:</span>
                            {m.cards.map((c) => (
                              <span key={c.id} className="mt-1 flex gap-2">
                                <span aria-hidden="true">·</span>
                                <ChatText text={`[${c.name}](${c.link})`} />
                              </span>
                            ))}
                          </span>
                        ) : null}
                        {m.quickReplies?.length ? (
                          <span className="mt-1 block text-[11px] text-subtle-foreground">
                            Nút: {m.quickReplies.map((q) => q.label).join(" · ")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ),
                )}
                {conversation?.aiPending && conversation.status === "AI" ? (
                  <p className="text-right text-xs text-subtle-foreground">Trợ lý đang soạn…</p>
                ) : null}
              </div>

              <form onSubmit={send} className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <label htmlFor="staff-chat-input" className="sr-only">
                    Trả lời khách
                  </label>
                  <textarea
                    id="staff-chat-input"
                    rows={2}
                    maxLength={1000}
                    disabled={closed}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={
                      closed
                        ? "Cuộc chat đã kết thúc"
                        : conversation?.status === "AI"
                          ? "Trả lời để nhận cuộc chat từ trợ lý tự động…"
                          : "Trả lời khách… (Enter để gửi)"
                    }
                    className="min-h-12 flex-1 resize-none rounded-[var(--radius-md)] border border-border-strong bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:border-accent focus:outline-none disabled:opacity-50"
                  />
                  <Button type="submit" variant="primary" size="md" disabled={closed || busy !== null || !draft.trim()}>
                    {busy === "send" ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <SendHorizontal aria-hidden="true" />
                    )}
                    Gửi
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
