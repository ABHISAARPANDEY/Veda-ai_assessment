"use client";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

export function Select({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: { label: string; value: string; typeKey: string }[];
  onChange: (label: string, value: string, typeKey: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => {
          const opt = options.find((o) => o.value === e.target.value);
          if (opt) onChange(opt.label, opt.value, opt.typeKey);
        }}
        className="form-select w-full h-11 rounded-xl bg-card border border-border pl-4 pr-10 text-sm focus:border-primary focus:ring-0 appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary pointer-events-none" />
    </div>
  );
}
