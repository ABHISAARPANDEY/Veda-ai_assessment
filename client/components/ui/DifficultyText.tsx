import type { Difficulty } from "../../types";

const LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Challenging",
};

const BADGE: Record<Difficulty, string> = {
  easy: "bg-green-100 text-green-700 ring-1 ring-green-200",
  medium: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  hard: "bg-red-100 text-red-700 ring-1 ring-red-200",
};

export function DifficultyText({ value }: { value: Difficulty }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${BADGE[value]}`}
    >
      {LABEL[value]}
    </span>
  );
}
