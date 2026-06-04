import type { Section } from "../../types";
import { DifficultyText } from "./DifficultyText";

const LETTERS = ["a", "b", "c", "d", "e", "f"];

export function QuestionList({ section, indexStart }: { section: Section; indexStart: number }) {
  return (
    <div className="text-left space-y-2">
      <h3 className="text-base font-bold">{section.title}</h3>
      {section.instruction && (
        <p className="text-sm italic text-secondary">{section.instruction}</p>
      )}
      <ol className="space-y-3 text-sm pl-1">
        {section.questions.map((q, i) => (
          <li key={q.id} className="leading-6">
            <div>
              <span className="font-medium">{indexStart + i}.</span>{" "}
              <DifficultyText value={q.difficulty} /> {q.text} [{q.marks} Marks]
            </div>
            {q.options && q.options.length > 0 && (
              <ol className="mt-2 pl-8 space-y-1 text-sm text-primary/90">
                {q.options.map((opt, j) => (
                  <li key={j} className="leading-6">
                    <span className="font-semibold mr-2">({LETTERS[j] ?? String(j + 1)})</span>
                    {opt}
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
