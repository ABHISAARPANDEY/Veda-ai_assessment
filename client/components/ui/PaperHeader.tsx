import { persona } from "../../lib/persona";

export function PaperHeader({
  totalMarks,
  schoolFullName,
}: {
  totalMarks: number;
  schoolFullName?: string;
}) {
  const school = schoolFullName ?? persona.school.fullName;
  return (
    <div className="space-y-1 text-center">
      <h1 className="text-lg font-bold">{school}</h1>
      <div className="text-sm">Subject: {persona.paperDefaults.subject}</div>
      <div className="text-sm">Class: {persona.paperDefaults.class}</div>
      <div className="mt-4 flex justify-between text-sm">
        <div>Time Allowed: {persona.paperDefaults.timeAllowed}</div>
        <div>Maximum Marks: {totalMarks}</div>
      </div>
      <p className="text-sm text-left mt-3">
        All questions are compulsory unless stated otherwise.
      </p>
      <div className="mt-3 text-sm text-left space-y-1">
        <div>
          Name: <input className="paper-line" type="text" />
        </div>
        <div>
          Roll Number: <input className="paper-line" type="text" />
        </div>
        <div>
          Class: {persona.paperDefaults.class}{" "}
          Section: <input className="paper-line" type="text" />
        </div>
      </div>
    </div>
  );
}
