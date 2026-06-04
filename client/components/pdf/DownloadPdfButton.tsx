"use client";
import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import type { QuestionPaperDTO, AssignmentDTO } from "../../types";

// @react-pdf/renderer must only run in the browser.
// We lazy-import it inside a useEffect so the server bundle is never touched.

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
  // usePDF instance – stored in a ref so we can access it on click without
  // triggering extra renders.
  const pdfRef = useRef<{
    loading: boolean;
    url: string | null;
    error: string | null;
  } | null>(null);

  const updateRef = useRef<
    ((doc: React.ReactElement) => void) | null
  >(null);

  const loadingRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { usePDF } = await import("@react-pdf/renderer");
      const { PaperPdfDocument } = await import("./PaperPdfDocument");

      // We can't call hooks outside of a component, but we can call usePDF
      // by rendering a tiny helper component. Instead, use the
      // pdf() streaming API which doesn't require a hook.
      const { pdf } = await import("@react-pdf/renderer");

      if (cancelled) return;

      const instance = pdf(
        <PaperPdfDocument
          assignment={assignment}
          paper={paper}
          schoolFullName={schoolFullName}
          subject={subject}
          className={className}
          timeAllowed={timeAllowed}
        />
      );

      const blob = await instance.toBlob();
      if (cancelled) return;

      const url = URL.createObjectURL(blob);
      pdfRef.current = { loading: false, url, error: null };
      loadingRef.current = false;
    })().catch((err) => {
      if (!cancelled) {
        pdfRef.current = { loading: false, url: null, error: String(err) };
        loadingRef.current = false;
      }
    });

    return () => {
      cancelled = true;
      if (pdfRef.current?.url) {
        URL.revokeObjectURL(pdfRef.current.url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filename = `${assignment.title
    .replace(/[^a-z0-9-]+/gi, "-")
    .toLowerCase()}.pdf`;

  async function handleClick() {
    // If PDF isn't ready yet, build it on demand
    if (!pdfRef.current?.url) {
      const { pdf } = await import("@react-pdf/renderer");
      const { PaperPdfDocument } = await import("./PaperPdfDocument");

      const instance = pdf(
        <PaperPdfDocument
          assignment={assignment}
          paper={paper}
          schoolFullName={schoolFullName}
          subject={subject}
          className={className}
          timeAllowed={timeAllowed}
        />
      );
      const blob = await instance.toBlob();
      const url = URL.createObjectURL(blob);
      pdfRef.current = { loading: false, url, error: null };
    }

    const url = pdfRef.current?.url;
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white text-primary border border-border font-semibold text-sm hover:bg-inset"
    >
      <Download className="h-4 w-4" />
      Download as PDF
    </button>
  );
}
