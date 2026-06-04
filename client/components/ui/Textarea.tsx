import { cn } from "../../lib/cn";

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        "form-textarea w-full rounded-xl bg-card border border-border p-4 text-sm placeholder:text-muted focus:border-primary focus:ring-0",
        className
      )}
    />
  );
}
