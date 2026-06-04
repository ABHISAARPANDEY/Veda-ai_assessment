import type { Section } from "../../types";

export function AnswerKey({ sections }: { sections: Section[] }) {
  const flat = sections.flatMap((s) => s.questions);
  const hasAnyAnswer = flat.some((q) => q.answer && q.answer.length > 0);
  if (!hasAnyAnswer) return null;
  return (
    <div className="mt-10 text-left">
      <h3 className="text-base font-bold mb-2">Answer Key:</h3>
      <ol className="space-y-2 text-sm">
        {flat.map((q, i) => (
          <li key={q.id} className="leading-6">
            <span className="font-medium">{i + 1}.</span> {q.answer}
          </li>
        ))}
      </ol>
    </div>
  );
}
