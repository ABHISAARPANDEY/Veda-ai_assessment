import type { Section } from "../../types";
import { DifficultyText } from "./DifficultyText";

export function QuestionList({ section, indexStart }: { section: Section; indexStart: number }) {
  return (
    <div className="text-left space-y-2">
      <h3 className="text-base font-bold">{section.title}</h3>
      {section.instruction && (
        <p className="text-sm italic text-secondary">{section.instruction}</p>
      )}
      <ol className="space-y-2 text-sm pl-1">
        {section.questions.map((q, i) => (
          <li key={q.id} className="leading-6">
            <span className="font-medium">{indexStart + i}.</span>{" "}
            <DifficultyText value={q.difficulty} /> {q.text} [{q.marks} Marks]
          </li>
        ))}
      </ol>
    </div>
  );
}
