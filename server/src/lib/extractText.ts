import pdfParse from "pdf-parse";

const MAX_CHARS = 20_000; // cap to keep token cost under control

export async function extractText(buffer: Buffer, mimetype: string): Promise<string> {
  let raw = "";
  if (mimetype === "application/pdf") {
    const parsed = await pdfParse(buffer);
    raw = parsed.text;
  } else if (mimetype === "text/plain" || mimetype === "text/markdown") {
    raw = buffer.toString("utf-8");
  } else {
    return "";
  }
  // Normalize whitespace and cap length
  const normalized = raw.replace(/\s+/g, " ").trim();
  return normalized.length > MAX_CHARS
    ? normalized.slice(0, MAX_CHARS) + "\n[truncated…]"
    : normalized;
}
