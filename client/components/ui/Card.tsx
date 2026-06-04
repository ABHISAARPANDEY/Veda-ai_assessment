import { cn } from "../../lib/cn";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("bg-card rounded-2xl shadow-card", className)}
    >
      {children}
    </div>
  );
}
