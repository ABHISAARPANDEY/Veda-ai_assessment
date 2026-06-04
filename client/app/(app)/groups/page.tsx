import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { auth } from "../../../auth";
import { listGroups } from "../../../lib/groupsApi";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const session = await auth();
  const token = (session as any)?.backendToken as string | undefined;
  const items = token ? await listGroups(token).catch(() => []) : [];

  return (
    <div className="space-y-6 pt-2 pb-32">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">My Groups</h1>
          <p className="text-sm text-secondary">Organize students into batches</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="h-12 w-12 mx-auto text-secondary mb-4" />
          <h2 className="text-xl font-bold mb-2">No groups yet</h2>
          <p className="text-sm text-secondary max-w-md mx-auto">
            Create your first group to manage your students. Add their names, roll numbers, and tag the class level.
          </p>
          <div className="mt-8">
            <Link href="/groups/new">
              <Button variant="dark">
                <Plus className="h-4 w-4" />
                Create your first group
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {items.map((g) => (
              <Card key={g._id} className="p-6">
                <Link
                  href={`/groups/${g._id}`}
                  className="text-xl font-bold underline underline-offset-4 decoration-2 text-primary"
                >
                  {g.name}
                </Link>
                <div className="mt-2 text-sm text-secondary">
                  {g.classLevel || "No level set"}
                </div>
                <div className="mt-6 flex items-center justify-between text-sm">
                  <span>
                    <span className="font-semibold">{g.students.length}</span>{" "}
                    student{g.students.length === 1 ? "" : "s"}
                  </span>
                  <Link
                    href={`/groups/${g._id}`}
                    className="text-primary font-semibold"
                  >
                    View →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-8">
            <Link href="/groups/new">
              <Button variant="dark">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
