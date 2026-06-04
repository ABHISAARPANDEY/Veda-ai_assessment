import { jsPDF } from "jspdf";
import type { QuestionPaperDTO, AssignmentDTO } from "../../types";

const DIFF_LABEL = { easy: "Easy", medium: "Moderate", hard: "Challenging" } as const;
const DIFF_RGB = {
  easy: [31, 139, 77] as const,
  medium: [184, 110, 0] as const,
  hard: [199, 54, 28] as const,
};

export interface BuildPaperPdfArgs {
  assignment: AssignmentDTO;
  paper: QuestionPaperDTO;
  schoolFullName: string;
  subject: string;
  classLevel: string;
  timeAllowed: string;
}

export function buildPaperPdf(args: BuildPaperPdfArgs): Blob {
  const { assignment, paper, schoolFullName, subject, classLevel, timeAllowed } = args;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeCenteredText = (text: string, size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, pageW / 2, y, { align: "center" });
    y += size * 1.3;
  };

  const writeLeftText = (text: string, size: number, bold = false, indent = 0, italic = false) => {
    const fontStyle = bold ? "bold" : italic ? "italic" : "normal";
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, contentW - indent) as string[];
    for (const line of lines) {
      ensureSpace(size * 1.4);
      doc.text(line, margin + indent, y);
      y += size * 1.4;
    }
  };

  const writeRowLR = (left: string, right: string, size: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    ensureSpace(size * 1.4);
    doc.text(left, margin, y);
    doc.text(right, pageW - margin, y, { align: "right" });
    y += size * 1.4;
  };

  // School header
  writeCenteredText(schoolFullName, 14, true);
  writeCenteredText(`Subject: ${subject}`, 11);
  writeCenteredText(`Class: ${classLevel}`, 11);
  y += 6;

  // Time / Marks row
  writeRowLR(`Time Allowed: ${timeAllowed}`, `Maximum Marks: ${assignment.totalMarks}`, 11);
  y += 4;
  writeLeftText("All questions are compulsory unless stated otherwise.", 11);
  y += 6;

  // Student info — drop the "Class:" prefix (already shown above)
  writeLeftText("Name: ______________________________", 11);
  writeLeftText("Roll Number: ______________________________", 11);
  writeLeftText("Section: ______________", 11);
  y += 8;

  // Sections + questions
  let runningIndex = 1;
  for (const section of paper.sections) {
    ensureSpace(40);
    y += 6;
    writeCenteredText(`Section ${section.id}`, 12, true);
    writeLeftText(section.title, 11, true);
    if (section.instruction) writeLeftText(section.instruction, 10, false, 0, true);

    for (let i = 0; i < section.questions.length; i++) {
      const q = section.questions[i];
      const prefix = `${runningIndex + i}. `;
      const diffLabel = DIFF_LABEL[q.difficulty];
      const tail = ` ${q.text} [${q.marks} Marks]`;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      // Measure widths to position the colored difficulty token inline
      const prefixWidth = doc.getTextWidth(prefix + "[");
      // The "[difficulty] question text" can wrap. For simplicity we render
      // the colored difficulty + the rest as a single wrapped block by
      // assembling a plain string then re-emitting the first line with color.
      const fullPlain = `${prefix}[${diffLabel}]${tail}`;
      const lines = doc.splitTextToSize(fullPlain, contentW) as string[];
      ensureSpace(11 * 1.4 * lines.length + 4);

      // Render line 1 with a colored substring
      const line1 = lines[0];
      // Draw the line normally in black first
      doc.setTextColor(0, 0, 0);
      doc.text(line1, margin, y);
      // Overdraw just the "[Easy]" part in color
      const [r, g, b] = DIFF_RGB[q.difficulty];
      doc.setTextColor(r, g, b);
      // Position colored part starting after the prefix
      doc.text(`[${diffLabel}]`, margin + doc.getTextWidth(prefix), y);
      doc.setTextColor(0, 0, 0);
      y += 11 * 1.4;

      // Remaining lines: just black
      for (let li = 1; li < lines.length; li++) {
        ensureSpace(11 * 1.4);
        doc.text(lines[li], margin, y);
        y += 11 * 1.4;
      }

      // Render options (for MCQ) under the question, indented
      if (q.options && q.options.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const letters = ["a", "b", "c", "d", "e", "f"];
        for (let k = 0; k < q.options.length; k++) {
          const letter = letters[k] ?? String(k + 1);
          const optText = `(${letter}) ${q.options[k]}`;
          const optLines = doc.splitTextToSize(optText, contentW - 24) as string[];
          for (const line of optLines) {
            ensureSpace(10 * 1.4);
            doc.text(line, margin + 24, y);
            y += 10 * 1.4;
          }
        }
        // restore the body font/size
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        y += 2;
      }

      y += 2;
      void prefixWidth;
    }
    runningIndex += section.questions.length;
  }

  // End of Question Paper
  ensureSpace(40);
  y += 12;
  writeCenteredText("End of Question Paper", 12, true);

  // Answer Key (if any)
  const allQs = paper.sections.flatMap((s) => s.questions);
  const hasAnswers = allQs.some((q) => q.answer && q.answer.length > 0);
  if (hasAnswers) {
    ensureSpace(40);
    y += 16;
    writeLeftText("Answer Key:", 12, true);
    for (let i = 0; i < allQs.length; i++) {
      const q = allQs[i];
      writeLeftText(`${i + 1}. ${q.answer}`, 10);
      y += 2;
    }
  }

  return doc.output("blob");
}
