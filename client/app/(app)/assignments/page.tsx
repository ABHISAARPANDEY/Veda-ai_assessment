import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";
import { listAssignments } from "../../../lib/api";
import { auth } from "../../../auth";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { AssignmentCard } from "../../../components/ui/AssignmentCard";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const session = await auth();
  const token = (session as any)?.backendToken as string | undefined;
  const items = await listAssignments(token).catch(() => []);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No assignments yet"
        description="Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading."
        ctaHref="/assignments/new"
        ctaLabel="Create Your First Assignment"
      />
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-secondary">Manage and create assignments for your classes.</p>
        </div>
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-inset text-sm">
          <Filter className="h-4 w-4 text-secondary" />
          Filter By
        </button>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 bg-inset rounded-full px-4 py-2">
            <Search className="h-4 w-4 text-secondary" />
            <input
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted"
              placeholder="Search Assignment"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((a) => (
          <AssignmentCard key={a._id} a={a} />
        ))}
      </div>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-8">
        <Link href="/assignments/new">
          <Button variant="dark">
            <Plus className="h-4 w-4" />
            Create Assignment
          </Button>
        </Link>
      </div>
    </div>
  );
}
