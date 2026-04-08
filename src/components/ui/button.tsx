import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm" | "lg";

type ButtonVariantProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: ButtonVariantProps = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-[10px] text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-light)] disabled:pointer-events-none disabled:opacity-50",
    variant === "default" &&
      "bg-[var(--color-primary)] text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] hover:bg-[var(--color-primary-dark)]",
    variant === "outline" &&
      "border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]",
    variant === "ghost" &&
      "text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]",
    size === "default" && "px-5 py-2.5",
    size === "sm" && "px-4 py-2",
    size === "lg" && "px-6 py-3",
    className,
  );
}
