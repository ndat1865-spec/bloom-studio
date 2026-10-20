import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SHOP_APP_URL } from "@/lib/links";

/**
 * Hien noi dung tin nhan cho nhan vien: xuong dong, gach dau dong, **dam**, link [chu](/duong-dan).
 * Link /orders/... mo trang chi tiet don cua app quan tri; link khac (vd. /products/5) la trang
 * cua cua hang nen mo tab moi o app khach. Link ngoai de nguyen van, khong bam duoc.
 */
const TOKEN = /\[([^\]]+)\]\((\/[^)\s]*)\)|\*\*([^*]+)\*\*/g;

const LINK_CLASS = "text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent";

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    if (match[1] && match[2]) {
      out.push(
        match[2].startsWith("/orders/") ? (
          <Link key={index} to={match[2]} className={LINK_CLASS}>
            {match[1]}
          </Link>
        ) : (
          <a key={index} href={SHOP_APP_URL + match[2]} target="_blank" rel="noreferrer" className={LINK_CLASS}>
            {match[1]}
          </a>
        ),
      );
    } else if (match[3]) {
      out.push(
        <strong key={index} className="font-medium">
          {match[3]}
        </strong>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ChatText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-•]\s+/.test(line);
        const content = bullet ? line.replace(/^\s*[-•]\s+/, "") : line;
        if (!content.trim()) return <span key={i} className="block h-2" aria-hidden="true" />;
        return bullet ? (
          <span key={i} className="flex gap-2">
            <span aria-hidden="true">·</span>
            <span>{inline(content)}</span>
          </span>
        ) : (
          <span key={i} className="block">
            {inline(content)}
          </span>
        );
      })}
    </>
  );
}
