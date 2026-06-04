"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { QuestionPaperDTO, AssignmentDTO } from "../../types";

export function DownloadPdfButton({
  assignment,
  paper,
  schoolFullName,
  subject,
  className,
  timeAllowed,
}: {
  assignment: AssignmentDTO;
  paper: QuestionPaperDTO;
  schoolFullName: string;
  subject: string;
  className: string;
  timeAllowed: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { PaperPdfDocument } = await import("./PaperPdfDocument");

      const doc = (
        <PaperPdfDocument
          assignment={assignment}
          paper={paper}
          schoolFullName={schoolFullName}
          subject={subject}
          className={className}
          timeAllowed={timeAllowed}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);

      const filename = `${assignment.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "question-paper"}.pdf`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      // Small delay before revoking so Firefox/Safari can finish
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error("[pdf] download failed:", err);
      alert(`Could not generate PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white text-primary border border-border font-semibold text-sm hover:bg-inset disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? "Preparing PDF…" : "Download as PDF"}
    </button>
  );
}
