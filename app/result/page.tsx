"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WritingVisual from "../components/WritingVisual";

type WritingReview = {
  overallBand: number;
  criteria: {
    taskAchievement: number;
    coherenceAndCohesion: number;
    lexicalResource: number;
    grammaticalRangeAndAccuracy: number;
  };
  checks: {
    wordCount: number;
    minWordCount: number;
    wordCountOk: boolean;
    relevanceToPrompt: number;
    structureQuality: number;
    grammarQuality: number;
  };
  strengths: string[];
  improvements: string[];
  summary: string;
};

type SimulationQuestion = {
  id: string;
  number: number;
  text: string;
  options?: string[];
  type: "mcq" | "text";
  correctAnswer?: number;
  explanation?: string;
  details?: {
    instructions?: string;
    statement?: string;
    questionText?: string;
    visualData?: {
      chartType?: string;
      title?: string;
      xAxisLabel?: string;
      yAxisLabel?: string;
      categories?: string[];
      series?: { name: string; data: number[] }[];
      units?: string;
      keyFeatures?: string[];
    };
    rubricFocus?: string[];
    sampleAnswer?: {
      bandScore?: number;
      content?: string;
      examinerComments?: string;
    };
    writingReview?: WritingReview;
  };
};

type SimulationSection = {
  id: string;
  title: string;
  questions: SimulationQuestion[];
};

type SectionResultSummary = {
  sectionId: string;
  sectionTitle: string;
  correct: number;
  total: number;
  percentage: number;
};

type SimulationResultData = {
  examType: "toefl" | "ielts";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sectionScores: SectionResultSummary[];
  totalCorrect: number;
  totalQuestions: number;
  totalPercentage: number;
  sections: SimulationSection[];
  answers: Record<string, string>;
};

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<SimulationResultData | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("simulation-result");
      if (!raw) {
        setResult(null);
        return;
      }
      setResult(JSON.parse(raw) as SimulationResultData);
    } catch {
      setResult(null);
    }
  }, []);

  const scoreMap = useMemo(() => {
    if (!result) return new Map<string, SectionResultSummary>();
    return new Map(result.sectionScores.map((s) => [s.sectionId, s]));
  }, [result]);

  if (!result) {
    return (
      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1>Hasil simulasi tidak ditemukan</h1>
        <p>Silakan jalankan simulasi terlebih dahulu.</p>
        <button onClick={() => router.push("/")} style={primaryBtn}>Kembali ke Simulasi</button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Hasil Simulasi {result.examType.toUpperCase()}</h1>
      <p style={{ marginTop: 0 }}>Difficulty: {result.difficulty}</p>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Total Skor</h2>
        <p style={{ marginBottom: 6 }}>
          Skor MCQ: {result.totalCorrect}/{result.totalQuestions}
        </p>
        <p style={{ marginTop: 0, fontWeight: 700 }}>{result.totalPercentage}%</p>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Detail Skor per Section</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {result.sectionScores.map((s) => (
            <div key={s.sectionId} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
              <strong>{s.sectionTitle}</strong>
              <div>
                {s.correct}/{s.total} ({s.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Review Soal per Section</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {result.sections.map((section, idx) => {
            const sectionScore = scoreMap.get(section.id);
            return (
              <details
                key={section.id}
                open={idx === 0}
                style={{ border: "1px solid #ccc", borderRadius: 10, padding: 12, background: "#fff" }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                  {section.title}
                  {sectionScore
                    ? ` — ${sectionScore.correct}/${sectionScore.total} (${sectionScore.percentage}%)`
                    : ""}
                </summary>

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {section.questions.map((q) => {
                    const key = `${section.id}:${q.id}`;
                    const userAnswer = result.answers[key] ?? "";
                    const isMcq = q.type === "mcq" && q.correctAnswer !== undefined;
                    const isCorrect = isMcq ? userAnswer === String(q.correctAnswer) : null;
                    const userAnswerLabel =
                      q.options && userAnswer !== "" && !Number.isNaN(Number(userAnswer))
                        ? `${Number(userAnswer) + 1}. ${q.options[Number(userAnswer)] ?? ""}`
                        : userAnswer || "(kosong)";
                    const correctAnswerLabel =
                      isMcq && q.options
                        ? `${(q.correctAnswer as number) + 1}. ${q.options[q.correctAnswer as number] ?? ""}`
                        : "N/A";

                    return (
                      <div key={q.id} style={{ background: "#fafafa", borderRadius: 8, padding: 10, border: "1px solid #eee" }}>
                        <p style={{ marginTop: 0, whiteSpace: "pre-wrap" }}>
                          <strong>Q{q.number}.</strong> {q.text}
                        </p>

                        {q.details?.statement && (
                          <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
                            <strong>Statement:</strong> {q.details.statement}
                          </p>
                        )}
                        {q.details?.questionText && (
                          <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
                            <strong>Question:</strong> {q.details.questionText}
                          </p>
                        )}
                        {q.details?.visualData && (
                          <WritingVisual visualData={q.details.visualData} />
                        )}
                        {q.details?.instructions && (
                          <p style={{ margin: "4px 0", fontSize: 12, color: "#475569" }}>
                            <strong>Note:</strong> {q.details.instructions}
                          </p>
                        )}

                        <p style={{ margin: "4px 0" }}>
                          <strong>Jawaban Anda:</strong> {userAnswerLabel}
                        </p>
                        <p style={{ margin: "4px 0" }}>
                          <strong>Jawaban Benar:</strong> {correctAnswerLabel}
                        </p>
                        <p style={{ margin: "4px 0" }}>
                          <strong>Status:</strong>{" "}
                          {isCorrect === null ? (q.type === "text" ? "Submitted" : "Belum dinilai otomatis") : isCorrect ? "Benar" : "Salah"}
                        </p>

                        {q.details?.writingReview && (
                          <div style={{ margin: "8px 0", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, background: "#f8fafc" }}>
                            <p style={{ margin: "0 0 6px 0" }}><strong>Writing Band:</strong> {q.details.writingReview.overallBand.toFixed(1)}/9</p>
                            <p style={{ margin: "0 0 6px 0" }}>
                              <strong>Checks:</strong> Word count {q.details.writingReview.checks.wordCount}/{q.details.writingReview.checks.minWordCount} ({q.details.writingReview.checks.wordCountOk ? "OK" : "Kurang"}), Relevance {q.details.writingReview.checks.relevanceToPrompt}%, Structure {q.details.writingReview.checks.structureQuality}%, Grammar {q.details.writingReview.checks.grammarQuality}%
                            </p>
                            <p style={{ margin: "0 0 6px 0" }}>
                              <strong>Criteria:</strong> TA {q.details.writingReview.criteria.taskAchievement}, CC {q.details.writingReview.criteria.coherenceAndCohesion}, LR {q.details.writingReview.criteria.lexicalResource}, GRA {q.details.writingReview.criteria.grammaticalRangeAndAccuracy}
                            </p>
                            <p style={{ margin: "0 0 6px 0" }}>
                              <strong>Strengths:</strong> {q.details.writingReview.strengths.join("; ")}
                            </p>
                            <p style={{ margin: 0 }}>
                              <strong>Improvements:</strong> {q.details.writingReview.improvements.join("; ")}
                            </p>
                          </div>
                        )}

                        <p style={{ margin: "4px 0" }}>
                          <strong>Pembahasan:</strong> {q.details?.writingReview?.summary || q.explanation || q.details?.sampleAnswer?.examinerComments || "Pembahasan belum tersedia."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <button onClick={() => router.push("/")} style={primaryBtn}>Kembali ke Simulasi</button>
    </main>
  );
}

const panelStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  background: "#1d4ed8",
  color: "white",
  cursor: "pointer",
};
