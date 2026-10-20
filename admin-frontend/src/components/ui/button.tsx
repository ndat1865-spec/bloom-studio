import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Nut theo quy uoc shadcn/ui (cva + Slot + class do du an so huu).
 * Kieu cong cu quan tri: chu thuong, bo goc 6px, cao 32–40px — khong in hoa gian chu
 * nhu nut cua cua hang. Du 5 trang thai: thuong, hover, nhan, focus, vo hieu.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans text-[0.8125rem] font-medium",
    "rounded-[var(--radius-sm)] border transition-[background-color,border-color,color] duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border-accent bg-accent text-background hover:border-accent-strong hover:bg-accent-strong",
        outline:
          "border-border-strong bg-transparent text-foreground hover:border-accent hover:text-accent",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        subtle:
          "border-border bg-surface-raised text-foreground hover:bg-surface-hover",
        danger:
          "border-danger/40 bg-danger/10 text-danger hover:border-danger hover:bg-danger hover:text-background",
        link: "h-auto border-transparent bg-transparent p-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "size-8 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
