"use client";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { QuestionPaperDTO, AssignmentDTO } from "../../types";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: "Helvetica",
    color: "#1A1A1A",
  },
  schoolHeader: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  centerSmall: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: { marginVertical: 4 },
  fillLine: { marginVertical: 3 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
  },
  sectionInstruction: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#555555",
    marginBottom: 6,
  },
  question: {
    marginBottom: 4,
    paddingLeft: 6,
  },
  diffEasy: { color: "#1F8B4D" },
  diffMedium: { color: "#B86E00" },
  diffHard: { color: "#C7361C" },
  endOfPaper: {
    marginTop: 20,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  answerKeyHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 20,
    marginBottom: 6,
  },
  answer: { marginBottom: 4, paddingLeft: 6 },
});

const DIFF_LABEL = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Challenging",
} as const;

const diffStyle = (d: keyof typeof DIFF_LABEL) =>
  d === "easy"
    ? styles.diffEasy
    : d === "medium"
    ? styles.diffMedium
    : styles.diffHard;

export interface PaperPdfDocumentProps {
  assignment: AssignmentDTO;
  paper: QuestionPaperDTO;
  schoolFullName: string;
  subject: string;
  className: string;
  timeAllowed: string;
}

export function PaperPdfDocument({
  assignment,
  paper,
  schoolFullName,
  subject,
  className,
  timeAllowed,
}: PaperPdfDocumentProps) {
  const allQuestions = paper.sections.flatMap((s) => s.questions);
  const hasAnyAnswer = allQuestions.some(
    (q) => q.answer && q.answer.length > 0
  );

  let runningIndex = 1;

  return (
    <Document title={assignment.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.schoolHeader}>{schoolFullName}</Text>
        <Text style={styles.centerSmall}>Subject: {subject}</Text>
        <Text style={styles.centerSmall}>Class: {className}</Text>

        <View style={styles.metaRow}>
          <Text>Time Allowed: {timeAllowed}</Text>
          <Text>Maximum Marks: {assignment.totalMarks}</Text>
        </View>

        <Text style={styles.paragraph}>
          All questions are compulsory unless stated otherwise.
        </Text>

        <Text style={styles.fillLine}>
          Name: ______________________________
        </Text>
        <Text style={styles.fillLine}>
          Roll Number: ______________________________
        </Text>
        <Text style={styles.fillLine}>
          Class: {className}{"  "}Section: ______________
        </Text>

        {paper.sections.map((section) => {
          const indexStart = runningIndex;
          runningIndex += section.questions.length;
          return (
            <View key={section.id} wrap>
              <Text style={styles.sectionTitle}>Section {section.id}</Text>
              <Text style={styles.sectionHeading}>{section.title}</Text>
              {section.instruction ? (
                <Text style={styles.sectionInstruction}>
                  {section.instruction}
                </Text>
              ) : null}
              {section.questions.map((q, i) => (
                <Text key={q.id} style={styles.question}>
                  {indexStart + i}.{"  ["}
                  <Text style={diffStyle(q.difficulty)}>
                    {DIFF_LABEL[q.difficulty]}
                  </Text>
                  {"]  "}
                  {q.text}{"  ["}
                  {q.marks} Marks{"]"}
                </Text>
              ))}
            </View>
          );
        })}

        <Text style={styles.endOfPaper}>End of Question Paper</Text>

        {hasAnyAnswer ? (
          <View wrap>
            <Text style={styles.answerKeyHeading}>Answer Key:</Text>
            {allQuestions.map((q, i) => (
              <Text key={q.id} style={styles.answer}>
                {i + 1}. {q.answer}
              </Text>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
