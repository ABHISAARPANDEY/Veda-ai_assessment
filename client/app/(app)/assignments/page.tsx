import { auth } from "../../../auth";
import { listAssignments } from "../../../lib/api";
import { EmptyState } from "../../../components/ui/EmptyState";
import { AssignmentsListView } from "../../../components/ui/AssignmentsListView";

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

  return <AssignmentsListView items={items} />;
}
