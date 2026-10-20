import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dialog theo quy uoc shadcn/ui tren nen Radix:
 * Radix lo focus trap, dong bang Esc va tra focus ve trigger.
 * Motion chi lo presence (mo/dong) — GSAP khong dong toi cac node nay.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const MotionOverlay = motion.create(DialogPrimitive.Overlay);
const MotionContent = motion.create(DialogPrimitive.Content);

export function DialogContent({
  open,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <DialogPrimitive.Portal forceMount>
          <MotionOverlay
            forceMount
            className="fixed inset-0 z-60 bg-background/80 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <MotionContent
            forceMount
            className={cn(
              "fixed left-1/2 top-1/2 z-60 w-[min(32rem,calc(100vw-2rem))]",
              "-translate-x-1/2 -translate-y-1/2",
              "border border-border bg-surface p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)]",
              className,
            )}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            <DialogPrimitive.Title className="display-lg pr-8 text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-3 text-sm font-light text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}

            {children ? <div className="mt-5">{children}</div> : null}
            {footer ? <div className="mt-7 flex flex-wrap justify-end gap-3">{footer}</div> : null}

            <DialogPrimitive.Close
              className={cn(
                "absolute right-4 top-4 p-2 text-muted-foreground transition-colors",
                "hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Đóng</span>
            </DialogPrimitive.Close>
          </MotionContent>
        </DialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  );
}
