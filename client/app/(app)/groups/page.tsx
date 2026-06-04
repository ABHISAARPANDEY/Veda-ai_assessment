import { Card } from "../../../components/ui/Card";
import { Users, Calendar, BarChart3, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default function GroupsPage() {
  return (
    <div className="space-y-6 pt-2 pb-12">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">My Groups</h1>
          <p className="text-sm text-secondary">Organize students into batches and assign papers in bulk</p>
        </div>
      </div>
      <Card className="p-10 text-center">
        <Users className="h-12 w-12 mx-auto text-secondary mb-4" />
        <h2 className="text-xl font-bold mb-2">Coming soon</h2>
        <p className="text-sm text-secondary max-w-md mx-auto">
          Group your students into classes (e.g. "Class 10A", "JEE Batch 2026") and assign question papers in bulk. Track group-level analytics.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8 text-left">
          <Feature icon={<UserPlus className="h-5 w-5" />} title="Roster management" desc="Add students manually or via CSV" />
          <Feature icon={<Calendar className="h-5 w-5" />} title="Bulk assignment" desc="Assign one paper to a whole group" />
          <Feature icon={<BarChart3 className="h-5 w-5" />} title="Group analytics" desc="Average scores, completion rate, difficulty heatmap" />
        </div>
      </Card>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-inset rounded-2xl p-4">
      <div className="text-primary mb-2">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-secondary mt-1">{desc}</div>
    </div>
  );
}
