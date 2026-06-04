"use client";
import { useRef, useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "./Button";

export function FileDropzone({
  onFile,
  accept = "application/pdf,text/plain,text/markdown,.pdf,.txt,.md",
}: {
  onFile: (f: File | null) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [name, setName] = useState<string | null>(null);

  function pick(f: File | null) {
    setName(f?.name ?? null);
    onFile(f);
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          const f = e.dataTransfer.files?.[0] ?? null;
          if (f) pick(f);
        }}
        className={
          "border border-dashed rounded-2xl py-12 px-6 bg-white text-center transition-colors " +
          (hover ? "border-primary bg-inset" : "border-dashed")
        }
      >
        <div className="grid place-items-center">
          <CloudUpload className="h-7 w-7 text-primary" />
        </div>
        <div className="mt-3 font-semibold">Choose a file or drag & drop it here</div>
        <div className="mt-1 text-xs text-muted">PDF, books, or text — upto 50MB</div>
        <div className="mt-4">
          <Button
            variant="white"
            size="sm"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>
        {name && <div className="mt-3 text-xs text-secondary">Selected: {name}</div>}
      </div>
      <div className="mt-2 text-center text-xs text-secondary">
        Upload a textbook, book, or any PDF — the AI will read it and base questions on its content (optional)
      </div>
    </>
  );
}
