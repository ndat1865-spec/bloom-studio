import { Fragment } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Hien noi dung tin nhan: xuong dong, gach dau dong "- ", **dam** va link [chu](/duong-dan).
 *
 * CHI link noi bo (bat dau bang "/") moi thanh the <a>: tro ly AI hay nhan vien go link ngoai
 * thi van hien nguyen van, khong bam duoc - khong the dung khung chat de dan khach toi trang la.
 * Khong dung dangerouslySetInnerHTML: moi thu dua ra deu la text node cua React.
 */
const TOKEN = /\[([^\]]+)\]\((\/[^)\s]*)\)|\*\*([^*]+)\*\*/g;

function inline(text: string, onNavigate?: () => void): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    if (match[1] && match[2]) {
      out.push(
        <Link
          key={index}
          to={match[2]}
          onClick={onNavigate}
          className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
        >
          {match[1]}
        </Link>,
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

export function ChatText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*[-•]\s+/.test(line);
        const content = bullet ? line.replace(/^\s*[-•]\s+/, "") : line;
        if (!content.trim()) return <span key={i} className="block h-2" aria-hidden="true" />;
        return bullet ? (
          <span key={i} className="flex gap-2">
            <span aria-hidden="true">·</span>
            <span>{inline(content, onNavigate)}</span>
          </span>
        ) : (
          <Fragment key={i}>
            <span className="block">{inline(content, onNavigate)}</span>
          </Fragment>
        );
      })}
    </>
  );
}
