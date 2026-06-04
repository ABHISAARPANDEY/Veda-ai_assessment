import Link from "next/link";
import { Library, ChevronRight } from "lucide-react";
import { auth } from "../../../auth";
import { listAssignments } from "../../../lib/api";
import { Card } from "../../../components/ui/Card";
import type { AssignmentDTO } from "../../../types";

export const dynamic = "force-dynamic";

function fmt(d?: string) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB").replace(/\//g, "-");
}

export default async function LibraryPage() {
  const session = await auth();
  const token = (session as any)?.backendToken as string | undefined;
  const items = (await listAssignments(token).catch(() => [])).filter(
    (a) => a.status === "completed"
  );

  // Group by classLevel
  const groups = new Map<string, AssignmentDTO[]>();
  for (const a of items) {
    const k = a.classLevel?.trim() || "Other";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }
  const orderedKeys = Array.from(groups.keys()).sort();

  return (
    <div className="space-y-6 pt-2 pb-24">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">My Library</h1>
          <p className="text-sm text-secondary">All your completed question papers, organised by class</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center">
          <Library className="h-12 w-12 mx-auto text-secondary mb-4" />
          <h2 className="text-xl font-bold mb-2">Your library is empty</h2>
          <p className="text-sm text-secondary max-w-md mx-auto">
            Question papers you generate will appear here, grouped by class level so you can find and reuse them later.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {orderedKeys.map((key) => {
            const group = groups.get(key)!;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">{key}</h2>
                  <span className="text-sm text-secondary">{group.length} paper{group.length === 1 ? "" : "s"}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.map((a) => (
                    <Card key={a._id} className="p-5">
                      <Link
                        href={`/assignments/${a._id}`}
                        className="flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{a.title}</div>
                          <div className="mt-1 text-xs text-secondary">
                            {a.subject?.trim() || "—"} · {a.numQuestions} questions · {a.totalMarks} marks
                          </div>
                          <div className="mt-1 text-xs text-secondary">
                            Created {fmt(a.createdAt)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-secondary group-hover:text-primary shrink-0" />
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
