import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Nut theo quy uoc shadcn/ui (cva + Slot + class do du an so huu),
 * tokens lay tu DESIGN.md: canh vuong, chu in hoa DM Sans 500, 5 trang thai day du.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-medium uppercase tracking-[0.1em]",
    "rounded-none border transition-colors duration-200 ease-[var(--ease-entrance)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border-accent bg-accent text-background hover:border-accent-strong hover:bg-accent-strong",
        outline:
          "border-accent bg-transparent text-accent hover:bg-accent hover:text-background",
        ghost:
          "border-border bg-transparent text-foreground hover:border-accent hover:text-accent",
        subtle:
          "border-transparent bg-surface-raised text-foreground hover:bg-primary",
        danger:
          "border-danger bg-transparent text-danger hover:bg-danger hover:text-background",
        link: "border-transparent bg-transparent p-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-[10px]",
        md: "h-11 px-6 text-[11px]",
        lg: "h-12 px-8 text-[11px]",
        icon: "size-11 px-0",
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
