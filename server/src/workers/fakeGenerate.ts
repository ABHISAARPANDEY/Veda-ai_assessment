import type { AssignmentDoc } from "../models/Assignment.js";
import type { Section } from "../types/questionPaper.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fakeGenerate(
  assignment: AssignmentDoc & { _id: unknown }
): Promise<{ sections: Section[] }> {
  // Simulate slow AI work.
  await sleep(3000);

  // Hardcoded, realistic 2-section paper.
  const sections: Section[] = [
    {
      id: "A",
      title: "Section A — Conceptual",
      instruction: "Answer ALL questions. Each question carries the marks indicated.",
      questions: [
        {
          id: "A1",
          text: "Define photosynthesis and write its balanced chemical equation.",
          difficulty: "easy",
          marks: 2,
          type: "short",
        },
        {
          id: "A2",
          text: "Which of the following is NOT a noble gas? (a) Neon (b) Argon (c) Oxygen (d) Krypton",
          difficulty: "easy",
          marks: 1,
          type: "mcq",
        },
        {
          id: "A3",
          text: "Explain how a transformer steps up voltage. Include a labelled diagram.",
          difficulty: "medium",
          marks: 5,
          type: "long",
        },
      ],
    },
    {
      id: "B",
      title: "Section B — Application",
      instruction: "Attempt any TWO of the following three questions.",
      questions: [
        {
          id: "B1",
          text: "A car accelerates uniformly from rest to 20 m/s in 5 s. Find the acceleration and distance covered.",
          difficulty: "medium",
          marks: 4,
          type: "short",
        },
        {
          id: "B2",
          text: "Compare and contrast aerobic and anaerobic respiration with examples.",
          difficulty: "hard",
          marks: 6,
          type: "long",
        },
        {
          id: "B3",
          text: "Newton's third law states that for every action there is an equal and opposite reaction. True or False?",
          difficulty: "easy",
          marks: 1,
          type: "mcq",
        },
      ],
    },
  ];

  // Reference the assignment so future real generation can be parameterised.
  void assignment;
  return { sections };
}
