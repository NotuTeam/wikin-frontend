import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BaseProps = HTMLAttributes<HTMLDivElement>;
type TitleProps = HTMLAttributes<HTMLHeadingElement>;
type DescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function Card({ className, children, ...props }: BaseProps) {
  return (
    <div
      className={cn("rounded-3xl border border-[var(--color-neutral-300)] bg-white", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: BaseProps) {
  return (
    <div className={cn("p-6 md:p-8", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: TitleProps) {
  return (
    <h2 className={cn("text-2xl font-semibold text-[var(--color-neutral-900)]", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...props }: DescriptionProps) {
  return (
    <p className={cn("text-sm leading-6 text-[var(--color-neutral-700)]", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: BaseProps) {
  return (
    <div className={cn("px-6 pb-6 md:px-8 md:pb-8", className)} {...props}>
      {children}
    </div>
  );
}
