"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";

export function Stepper({
  value,
  min = 0,
  max = 99,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={dec}
        className="h-7 w-7 grid place-items-center rounded-full border border-border text-primary hover:bg-inset"
        aria-label="decrement"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        className="h-7 w-7 grid place-items-center rounded-full border border-border text-primary hover:bg-inset"
        aria-label="increment"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
