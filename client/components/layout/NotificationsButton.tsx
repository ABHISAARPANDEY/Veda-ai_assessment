"use client";
import { Bell } from "lucide-react";

export function NotificationsButton() {
  return (
    <button
      type="button"
      className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
    </button>
  );
}
