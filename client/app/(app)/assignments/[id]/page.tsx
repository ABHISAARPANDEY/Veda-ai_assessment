import { notFound } from "next/navigation";
import { getAssignment } from "../../../../lib/api";
import { auth } from "../../../../auth";
import { persona } from "../../../../lib/persona";
import { Card } from "../../../../components/ui/Card";
import { PaperBanner } from "../../../../components/ui/PaperBanner";
import { PaperHeader } from "../../../../components/ui/PaperHeader";
import { QuestionList } from "../../../../components/ui/QuestionList";
import { AnswerKey } from "../../../../components/ui/AnswerKey";
import { DownloadPdfButton } from "../../../../components/pdf/DownloadPdfButton";

export const dynamic = "force-dynamic";

export default async function AssignmentPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const token = (session as any)?.backendToken as string | undefined;
  let data: Awaited<ReturnType<typeof getAssignment>>;
  try {
    data = await getAssignment(id, token);
  } catch {
    notFound();
  }
  if (!data.paper) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Card className="px-12 py-16 text-2xl font-bold text-primary">
          Created Assignments will appear here
        </Card>
      </div>
    );
  }

  const { assignment, paper } = data;
  const banner = `Certainly, ${persona.user.firstName}! Here are customized Question Paper for "${assignment.title}":`;

  const userSchool = ((session?.user as any)?.school as string | undefined)?.trim();
  const schoolFullName = userSchool || persona.school.fullName;

  // numbering continues across sections
  let runningIndex = 1;

  return (
    <div className="space-y-6 pt-2 pb-12">
      <PaperBanner
        message={banner}
        rightSlot={
          <DownloadPdfButton
            assignment={assignment}
            paper={paper}
            schoolFullName={schoolFullName}
            subject={persona.paperDefaults.subject}
            className={persona.paperDefaults.class}
            timeAllowed={persona.paperDefaults.timeAllowed}
          />
        }
      />
      <Card className="p-8 lg:p-12">
        <PaperHeader totalMarks={assignment.totalMarks} schoolFullName={schoolFullName} />
        <div className="mt-8 space-y-8">
          {paper.sections.map((section) => {
            const block = (
              <div key={section.id} className="space-y-4">
                <h2 className="text-base font-bold text-center">Section {section.id}</h2>
                <QuestionList section={section} indexStart={runningIndex} />
              </div>
            );
            runningIndex += section.questions.length;
            return block;
          })}
          <p className="text-center font-bold mt-6">End of Question Paper</p>
          <AnswerKey sections={paper.sections} />
        </div>
      </Card>
    </div>
  );
}
