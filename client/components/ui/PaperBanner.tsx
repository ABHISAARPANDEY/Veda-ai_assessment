import { Sparkles, Download } from "lucide-react";
import { Button } from "./Button";

export function PaperBanner({ message }: { message: string }) {
  return (
    <div className="bg-primary text-white rounded-3xl p-5 flex items-start gap-3 shadow-card">
      <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      <Button variant="white" size="sm" type="button">
        <Download className="h-4 w-4" />
        Download as PDF
      </Button>
    </div>
  );
}
