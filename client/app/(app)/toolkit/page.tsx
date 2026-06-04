import { Card } from "../../../components/ui/Card";
import { Sparkles, BookOpen, FileQuestion, GraduationCap, Languages, Wand2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ToolkitPage() {
  return (
    <div className="space-y-6 pt-2 pb-12">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">AI Teacher's Toolkit</h1>
          <p className="text-sm text-secondary">AI utilities to speed up your teaching workflow</p>
        </div>
      </div>
      <Card className="p-10">
        <div className="text-center mb-8">
          <Sparkles className="h-12 w-12 mx-auto text-accent mb-4" />
          <h2 className="text-xl font-bold">Coming soon</h2>
          <p className="text-sm text-secondary max-w-md mx-auto mt-2">
            A suite of AI helpers beyond question paper generation. Each tool follows the same strict-validation pipeline as the assessment creator — never raw LLM output.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Tool icon={<BookOpen className="h-5 w-5" />} title="Lesson Planner" desc="Generate a lesson plan for any topic, class, and duration" />
          <Tool icon={<FileQuestion className="h-5 w-5" />} title="Quick Quiz" desc="5-question quiz on any topic in under 10 seconds" />
          <Tool icon={<GraduationCap className="h-5 w-5" />} title="Concept Explainer" desc="Paste a concept, get a class-level-appropriate explanation" />
          <Tool icon={<Wand2 className="h-5 w-5" />} title="Worksheet Generator" desc="Practice problems with varied difficulty" />
          <Tool icon={<Languages className="h-5 w-5" />} title="Translation" desc="Convert papers to Hindi, Tamil, and other Indian languages" />
          <Tool icon={<Sparkles className="h-5 w-5" />} title="Rubric Builder" desc="Generate grading criteria for essays and projects" />
        </div>
      </Card>
    </div>
  );
}

function Tool({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-inset rounded-2xl p-5">
      <div className="text-primary mb-3">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-secondary mt-1 leading-5">{desc}</div>
    </div>
  );
}
