import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Anh dai dien dang chu cai — khong can upload anh.
 *
 * Lay toi da 2 chu cai dau cua ten. Dung Intl.Segmenter de dem theo "ky tu nguoi doc thay"
 * thay vi theo ma UTF-16: chu tieng Viet co dau nhu "Đạt" van ra dung "Đ", khong bi vo dau.
 */

const SIZES = {
  sm: "size-9 text-[0.7rem]",
  md: "size-11 text-sm",
  lg: "size-20 text-xl",
  xl: "size-24 text-2xl",
} as const;

function firstLetter(word: string): string {
  if (!word) return "";
  // Segmenter co o moi trinh duyet hien dai; van chan phong khi khong co.
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });
    const first = segmenter.segment(word)[Symbol.iterator]().next();
    if (!first.done) return first.value.segment;
  }
  return word.charAt(0);
}

export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return firstLetter(words[0]).toUpperCase();
  // Ho + ten: lay chu dau cua tu dau va tu CUOI ("Nguyen Tien Dat" -> "ND")
  return (firstLetter(words[0]) + firstLetter(words[words.length - 1])).toUpperCase();
}

export function InitialsAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  /** Anh dai dien (vd. tu Google). Khong co / tai hong thi quay ve chu cai dau. */
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // Nho anh nao da tai hong, doi anh khac thi thu lai
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full",
        "bg-accent/15 font-display font-semibold italic leading-none text-accent",
        "ring-1 ring-inset ring-accent/30",
        // Co san transition de nhung noi boc avatar trong nut co the doi mau/vien muot ma
        "transition-[background-color,color,box-shadow,transform] duration-300 ease-out",
        SIZES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          // Anh Google (lh3.googleusercontent.com) hay tra 403 khi co Referer tu trang khac
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailedSrc(src ?? null)}
          className="size-full rounded-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

/* ============================================================
   Hieu ung dung chung cho moi noi boc avatar trong mot phan tu BAM DUOC.
   De o day de navbar va dashboard admin khong bi lech nhau khi sau nay chinh mau.

   Cach dung: phan tu cha co class "group", roi
     <AvatarGlow active={...} />
     <InitialsAvatar className={cn(AVATAR_HOVER, active && AVATAR_ACTIVE)} ... />
   ============================================================ */

/** Sang len khi re chuot hoac tab toi. */
export const AVATAR_HOVER =
  "group-hover:bg-accent/25 group-hover:text-accent-strong group-hover:ring-accent/70 " +
  "group-focus-visible:bg-accent/25 group-focus-visible:ring-accent/70";

/** Giu ve "dang bat" ke ca khi chuot da di cho khac (vi du menu dang mo). */
export const AVATAR_ACTIVE = "bg-accent/25 text-accent-strong ring-accent/70";

/**
 * Vong sang toa ra phia sau avatar.
 * Dung scale thay vi doi kich thuoc that de khong lam xe dich cac phan tu ben canh.
 */
export function AvatarGlow({ active = false }: { active?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-full bg-accent/10",
        "scale-75 opacity-0 transition-[transform,opacity] duration-300 ease-out",
        "group-hover:scale-100 group-hover:opacity-100",
        active && "scale-100 opacity-100",
      )}
    />
  );
}
