"use client";
import { Calendar } from "lucide-react";
import { cn } from "../../lib/cn";

export function DateInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="DD-MM-YYYY"
        className="form-input w-full h-12 rounded-xl bg-card border border-border pl-4 pr-12 text-sm placeholder:text-muted focus:border-primary focus:ring-0"
      />
      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary pointer-events-none" />
    </div>
  );
}
