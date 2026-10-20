import { cn } from "@/lib/utils";

/**
 * Tieu de section: nhan micro dusty rose + tieu de serif nghieng + duong ke ke
 * (duong ke duoc GSAP animate scaleX 0 -> 1, xem lib/motion.ts).
 * Can trai — theo DESIGN.md, asymmetry doc tu tin hon mot chong khoi can giua.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? (
        <p data-anim="fade-up" className="label-micro mb-5 text-accent">
          {eyebrow}
        </p>
      ) : null}

      <h2 id={id} data-anim="fade-up" className="display-section text-foreground">
        {title}
      </h2>

      <span
        data-anim="rule"
        aria-hidden="true"
        className="mt-6 block h-px w-28 bg-accent"
      />

      {description ? (
        <p
          data-anim="fade-up"
          className="prose-measure mt-6 text-[1.0625rem] font-light leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
