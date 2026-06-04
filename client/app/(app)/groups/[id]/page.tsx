import { notFound } from "next/navigation";
import { auth } from "../../../../auth";
import { getGroup } from "../../../../lib/groupsApi";
import { Card } from "../../../../components/ui/Card";
import { Users } from "lucide-react";
import { DeleteGroupButton } from "../../../../components/ui/DeleteGroupButton";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const token = (session as any)?.backendToken as string | undefined;
  if (!token) notFound();
  const group = await getGroup(id, token);
  if (!group) notFound();

  return (
    <div className="space-y-6 pt-2 pb-12">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-sm text-secondary">{group.classLevel || "No level set"}</p>
          </div>
        </div>
        <DeleteGroupButton id={group._id} />
      </div>

      <Card className="p-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" /> Students ({group.students.length})
        </h2>
        {group.students.length === 0 ? (
          <p className="text-sm text-secondary">No students added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary border-b border-border">
                <th className="py-2 font-semibold">#</th>
                <th className="py-2 font-semibold">Name</th>
                <th className="py-2 font-semibold">Roll no.</th>
              </tr>
            </thead>
            <tbody>
              {group.students.map((s, i) => (
                <tr key={i} className="border-b border-border/60 last:border-b-0">
                  <td className="py-3 text-secondary">{i + 1}</td>
                  <td className="py-3 font-medium">{s.name}</td>
                  <td className="py-3 text-secondary">{s.rollNo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
