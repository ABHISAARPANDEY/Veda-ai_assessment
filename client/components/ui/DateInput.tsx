"use client";
import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { cn } from "../../lib/cn";

function isoToDate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(d: Date | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(d: Date | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function DateInput({
  value,
  onChange,
  className,
}: {
  value: string;            // ISO date string (YYYY-MM-DD)
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = isoToDate(value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="form-input w-full h-12 rounded-xl bg-card border border-border pl-4 pr-12 text-sm text-left placeholder:text-muted focus:border-primary focus:ring-0 flex items-center"
      >
        <span className={selected ? "text-primary" : "text-muted"}>
          {selected ? formatDisplay(selected) : "Pick a date"}
        </span>
      </button>
      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary pointer-events-none" />

      {open && (
        <div className="absolute z-30 mt-2 bg-card shadow-cardLg rounded-2xl p-3 border border-border">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              onChange(dateToIso(d ?? undefined));
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={new Date(new Date().getFullYear() - 1, 0)}
            endMonth={new Date(new Date().getFullYear() + 5, 11)}
            styles={{
              caption_label: { fontWeight: 600 },
            }}
          />
        </div>
      )}
    </div>
  );
}
