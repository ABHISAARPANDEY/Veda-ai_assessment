"use client";
import { cn } from "../../lib/cn";

type Variant = "dark" | "ghost" | "white";
type Size = "sm" | "md";

export function Button({
  variant = "dark",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-9 px-4 text-sm" : "h-11 px-6 text-sm",
        variant === "dark" && "bg-primary text-white hover:bg-black",
        variant === "white" && "bg-white text-primary border border-border hover:bg-inset",
        variant === "ghost" && "bg-transparent text-primary hover:bg-inset",
        className
      )}
    >
      {children}
    </button>
  );
}
