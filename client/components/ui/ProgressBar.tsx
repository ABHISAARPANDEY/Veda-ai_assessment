import { cn } from "../../lib/cn";

export function ProgressBar({
  step,
  total,
  className,
}: {
  step: number; // 1-indexed current step
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full gap-1.5", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i < step ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
