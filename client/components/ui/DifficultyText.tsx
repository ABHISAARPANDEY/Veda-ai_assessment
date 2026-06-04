import type { Difficulty } from "../../types";
import { cn } from "../../lib/cn";

const LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Challenging",
};

const COLOR: Record<Difficulty, string> = {
  easy: "text-diffEasy",
  medium: "text-diffMedium",
  hard: "text-diffHard",
};

export function DifficultyText({ value }: { value: Difficulty }) {
  return (
    <>
      [<span className={cn("font-medium", COLOR[value])}>{LABEL[value]}</span>]
    </>
  );
}
