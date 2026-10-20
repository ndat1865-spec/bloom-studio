import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const MotionOverlay = motion.create(DialogPrimitive.Overlay);
const MotionContent = motion.create(DialogPrimitive.Content);

/**
 * Ngan keo truot tu ben phai — noi dat bieu mau them/sua cua trang quan tri,
 * de bang du lieu duoc chiem tron chieu rong.
 * Radix lo focus trap, Esc va tra focus ve nut da mo; Motion lo hieu ung vao/ra.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <MotionOverlay
              forceMount
              className="fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <MotionContent
              forceMount
              className={cn(
                "fixed inset-y-0 right-0 z-50 flex w-[min(30rem,100vw)] flex-col",
                "border-l border-border bg-surface shadow-[var(--shadow-pop)] focus:outline-none",
                className,
              )}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
                    {title}
                  </DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                      {description}
                    </DialogPrimitive.Description>
                  ) : (
                    <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                  )}
                </div>
                <DialogPrimitive.Close className="-mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">Đóng</span>
                </DialogPrimitive.Close>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

              {footer ? (
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-surface px-6 py-4">
                  {footer}
                </div>
              ) : null}
            </MotionContent>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
