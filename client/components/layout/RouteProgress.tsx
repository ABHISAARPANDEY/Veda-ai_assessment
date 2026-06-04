"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A tiny top-of-page progress bar that appears on every route change.
 * Pure CSS animation, no external dep.
 * Resets when the pathname or search params change.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [key, setKey] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    setKey((k) => k + 1);
    const t = setTimeout(() => setActive(false), 700);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none"
    >
      <div
        key={key}
        className={`h-full bg-accent transition-all duration-500 ease-out ${
          active ? "w-3/4 opacity-100" : "w-full opacity-0"
        }`}
        style={{
          transitionDuration: active ? "500ms" : "200ms",
        }}
      />
    </div>
  );
}
