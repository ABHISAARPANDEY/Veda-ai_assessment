import { persona } from "../../lib/persona";

export function PaperHeader({
  totalMarks,
  schoolFullName,
  subject,
  className,
  timeAllowed,
}: {
  totalMarks: number;
  schoolFullName?: string;
  subject?: string;
  className?: string;
  timeAllowed?: string;
}) {
  const school = schoolFullName ?? persona.school.fullName;
  const subj = subject?.trim() || persona.paperDefaults.subject;
  const cls = className?.trim() || persona.paperDefaults.class;
  const time = timeAllowed?.trim() || persona.paperDefaults.timeAllowed;

  return (
    <div className="space-y-1 text-center">
      <h1 className="text-lg font-bold">{school}</h1>
      <div className="text-sm">Subject: {subj}</div>
      <div className="text-sm">Class: {cls}</div>
      <div className="mt-4 flex justify-between text-sm">
        <div>Time Allowed: {time}</div>
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
          Class: {cls}{" "}
          Section: <input className="paper-line" type="text" />
        </div>
      </div>
    </div>
  );
}
