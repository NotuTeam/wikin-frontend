"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WritingVisual } from "@/components/features/WritingVisual";

import {
  streamGenerate,
  idbGetSession,
  idbDeleteSession,
  idbSetSession,
  decryptLocalSession,
  encryptLocalSession,
  formatTime,
  EXAM_TEMPLATES,
  TOEFL_LISTENING_PARTS,
  IELTS_LISTENING_PARTS,
  API_URL,
} from "@/lib";

import {
  Difficulty,
  ExamType,
  SimulationQuestion,
  SimulationSection,
  SectionTemplate,
  SimulationResultData,
  SimulationSessionPayload,
} from "@/types";

const toQuestion = (question: any, index: number): SimulationQuestion => {
  let text =
    question?.questionText || question?.question || `Question ${index + 1}`;

  if (question?.sentence) {
    text = `${text}\n\nReference Sentence: ${question.sentence}`;
  }

  return {
    id: `q-${index + 1}`,
    number: index + 1,
    text,
    options: Array.isArray(question?.options) ? question.options : undefined,
    type: Array.isArray(question?.options) ? "mcq" : "text",
    correctAnswer:
      typeof question?.correctAnswer === "number"
        ? question.correctAnswer
        : undefined,
    explanation:
      question?.explanation?.correctAnswer ||
      question?.explanation?.grammarRule ||
      question?.explanation ||
      undefined,
  };
};

export default function SimulationPage() {
  const [examType, setExamType] = useState<ExamType>("toefl");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [sections, setSections] = useState<SimulationSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [failedSectionIndex, setFailedSectionIndex] = useState<number | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsElapsedSeconds, setTtsElapsedSeconds] = useState(0);
  const [ttsEstimatedSeconds, setTtsEstimatedSeconds] = useState(0);
  const [ttsPermissionAccepted, setTtsPermissionAccepted] = useState(false);
  const [showTtsPermissionModal, setShowTtsPermissionModal] = useState(false);
  const [ttsUnavailableReason, setTtsUnavailableReason] = useState<string | null>(null);
  const [showNextSectionModal, setShowNextSectionModal] = useState(false);
  const [nextFlowAction, setNextFlowAction] = useState<
    "next" | "finish" | null
  >(null);
  const [failedListeningPartIndex, setFailedListeningPartIndex] = useState<
    number | null
  >(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [recoverableSessionPayload, setRecoverableSessionPayload] =
    useState<SimulationSessionPayload | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsProgressTimerRef = useRef<number | null>(null);
  const toeflListeningPartialRef = useRef<Record<string, any>>({});
  const ieltsListeningPartialRef = useRef<Record<string, any>>({});
  const persistDebounceRef = useRef<number | null>(null);
  const lastPersistedHashRef = useRef("");
  const lastPersistedAtRef = useRef(0);

  const router = useRouter();
  const templates = useMemo(() => EXAM_TEMPLATES[examType], [examType]);
  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  const activeListeningTrack = useMemo(() => {
    if (!currentSection || currentSection.id !== "listening") return null;
    if (!currentSection.listeningTracks.length) return null;
    return (
      currentSection.listeningTracks.find(
        (track) =>
          currentQuestionIndex + 1 >= track.start &&
          currentQuestionIndex + 1 <= track.end,
      ) || null
    );
  }, [currentSection, currentQuestionIndex]);

  const stopTts = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (ttsProgressTimerRef.current) {
      window.clearInterval(ttsProgressTimerRef.current);
      ttsProgressTimerRef.current = null;
    }
    window.speechSynthesis.cancel();
    speechRef.current = null;
    setTtsPlaying(false);
    setTtsElapsedSeconds(0);
    setTtsEstimatedSeconds(0);
  };

  const ensureTtsReady = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTtsUnavailableReason(
        "Text-to-Speech is not supported on this browser/device.",
      );
      return false;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      setTtsUnavailableReason(
        "No speech voice is available on this device. Please enable a system voice and try again.",
      );
      return false;
    }

    setTtsUnavailableReason(null);
    return true;
  };

  const playTts = (text: string) => {
    if (!text) return;

    if (!ttsPermissionAccepted) {
      setShowTtsPermissionModal(true);
      return;
    }

    if (!ensureTtsReady()) return;

    if (ttsProgressTimerRef.current) {
      window.clearInterval(ttsProgressTimerRef.current);
      ttsProgressTimerRef.current = null;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;

    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(
      1,
      Math.ceil((words / 150) * (60 / utterance.rate)),
    );

    setTtsEstimatedSeconds(estimatedSeconds);
    setTtsElapsedSeconds(0);

    utterance.onend = () => {
      if (ttsProgressTimerRef.current) {
        window.clearInterval(ttsProgressTimerRef.current);
        ttsProgressTimerRef.current = null;
      }
      setTtsElapsedSeconds(estimatedSeconds);
      setTtsPlaying(false);
    };
    utterance.onerror = () => {
      if (ttsProgressTimerRef.current) {
        window.clearInterval(ttsProgressTimerRef.current);
        ttsProgressTimerRef.current = null;
      }
      setTtsUnavailableReason(
        "TTS playback failed or was blocked by your device/browser settings.",
      );
      setTtsPlaying(false);
    };

    ttsProgressTimerRef.current = window.setInterval(() => {
      setTtsElapsedSeconds((prev) => Math.min(estimatedSeconds, prev + 1));
    }, 1000);

    speechRef.current = utterance;
    setTtsPlaying(true);
    setTtsUnavailableReason(null);
    window.speechSynthesis.speak(utterance);
  };

  const updateSection = (index: number, patch: Partial<SimulationSection>) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  };

  useEffect(() => {
    if (!started || !currentSection) return;
    const canRunTimer =
      currentSection.status === "done" ||
      (currentSection.id === "listening" &&
        currentSection.status === "generating" &&
        currentSection.questions.length > 0);
    if (!canRunTimer) return;
    if (currentSection.questions.length === 0) return;
    if (remainingSeconds <= 0) return;
    const timer = setInterval(
      () => setRemainingSeconds((prev) => Math.max(0, prev - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [started, remainingSeconds, currentSection]);

  useEffect(() => {
    stopTts();
  }, [currentSectionIndex]);

  useEffect(() => {
    return () => stopTts();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const encrypted = await idbGetSession();
        if (!encrypted) return;
        const payload = await decryptLocalSession(encrypted);
        if (!payload) {
          await idbDeleteSession();
          return;
        }

        setSessionActive(true);
        setRecoverableSessionPayload(payload);
      } catch {
        try {
          await idbDeleteSession();
        } catch {}
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPermission = localStorage.getItem("wikin-tts-permission");
    if (storedPermission === "accepted") {
      setTtsPermissionAccepted(true);
      if (!ensureTtsReady()) {
        setTtsPermissionAccepted(false);
      }
      return;
    }

    setShowTtsPermissionModal(true);

    if (!("speechSynthesis" in window)) {
      setTtsUnavailableReason(
        "Text-to-Speech is not supported on this browser/device.",
      );
    }
  }, []);

  const handleAcceptTtsPermission = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wikin-tts-permission", "accepted");
    }
    setTtsPermissionAccepted(true);
    setShowTtsPermissionModal(false);
    if (!ensureTtsReady()) {
      setTtsPermissionAccepted(false);
    }
  };

  const handleRejectTtsPermission = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wikin-tts-permission", "rejected");
    }
    setTtsPermissionAccepted(false);
    setShowTtsPermissionModal(false);
    setTtsUnavailableReason(
      "TTS is disabled. You can still continue the simulation without audio playback.",
    );
    stopTts();
  };

  const answeredCount = useMemo(() => {
    if (!currentSection) return 0;
    return currentSection.questions.filter((q) =>
      answers[`${currentSection.id}:${q.id}`]?.trim(),
    ).length;
  }, [answers, currentSection]);

  const nextSection = sections[currentSectionIndex + 1];
  const nextSectionReady =
    !nextSection ||
    nextSection.status === "done" ||
    nextSection.status === "skipped";
  const currentSectionReady =
    !!currentSection &&
    (currentSection.status === "done" || currentSection.status === "skipped");
  const allSectionsGenerated =
    sections.length === templates.length &&
    sections.every(
      (section) => section.status === "done" || section.status === "skipped",
    );
  const isLastSection = currentSectionIndex >= sections.length - 1;

  const calculateSectionScore = (section: SimulationSection) => {
    if (section.id === "writing") {
      const reviewed = section.questions.filter(
        (q) => q.details?.writingReview,
      );
      const total = section.questions.length;

      if (reviewed.length > 0) {
        const avgBand =
          reviewed.reduce(
            (sum, q) => sum + (q.details?.writingReview?.overallBand || 0),
            0,
          ) / reviewed.length;
        return {
          correct: Math.round((avgBand / 9) * 100),
          total: 100,
          percentage: Math.round((avgBand / 9) * 100),
        };
      }

      const answered = section.questions.filter((q) =>
        answers[`${section.id}:${q.id}`]?.trim(),
      ).length;
      return {
        correct: answered,
        total,
        percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
      };
    }

    let correct = 0;
    let total = 0;

    section.questions.forEach((q) => {
      if (q.type === "mcq" && q.correctAnswer !== undefined) {
        total += 1;
        const userAnswer = answers[`${section.id}:${q.id}`];
        if (userAnswer === String(q.correctAnswer)) {
          correct += 1;
        }
      }
    });

    return {
      correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  };

  const evaluateIeltsWriting = async (currentSections: SimulationSection[]) => {
    if (examType !== "ielts") return currentSections;

    const writingSection = currentSections.find(
      (section) => section.id === "writing",
    );
    if (!writingSection) return currentSections;

    const reviewedQuestions = await Promise.all(
      writingSection.questions.map(async (q) => {
        const answerKey = `${writingSection.id}:${q.id}`;
        const answer = answers[answerKey] || "";
        const taskRaw = writingSection.rawQuestions?.[q.number - 1] || null;

        if (!taskRaw) return q;

        try {
          const resp = await fetch(
            `${API_URL}/api/questions/ielts/writing/review`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ task: taskRaw, answer }),
            },
          );
          const data = await resp.json();
          if (!resp.ok || !data?.success || !data?.data) return q;

          return {
            ...q,
            explanation: data.data.summary || q.explanation,
            details: {
              ...(q.details || {}),
              writingReview: data.data,
            },
          } as SimulationQuestion;
        } catch {
          return q;
        }
      }),
    );

    return currentSections.map((section) =>
      section.id === "writing"
        ? { ...section, questions: reviewedQuestions }
        : section,
    );
  };

  const buildSessionPayload = (): SimulationSessionPayload => ({
    examType,
    difficulty,
    started,
    sections,
    currentSectionIndex,
    currentQuestionIndex,
    remainingSeconds,
    answers,
    failedSectionIndex,
    failedListeningPartIndex,
    progress,
    error,
    toeflListeningPartial: toeflListeningPartialRef.current,
    ieltsListeningPartial: ieltsListeningPartialRef.current,
  });

  const persistSession = async (payload: SimulationSessionPayload) => {
    if (!sessionActive) return;

    const payloadWithCheckpoint = {
      ...payload,
      remainingSecondsCheckpoint: Math.floor(
        (payload.remainingSeconds || 0) / 15,
      ),
    };
    const payloadHash = JSON.stringify(payloadWithCheckpoint);
    const now = Date.now();

    if (payloadHash === lastPersistedHashRef.current) return;
    if (now - lastPersistedAtRef.current < 4000) return;

    try {
      const encrypted = await encryptLocalSession(payload);
      await idbSetSession(encrypted);
      lastPersistedHashRef.current = payloadHash;
      lastPersistedAtRef.current = now;
    } catch {}
  };

  const buildResultData = (
    finalSections: SimulationSection[] = sections,
  ): SimulationResultData => {
    const sectionScores = finalSections.map((section) => {
      const score = calculateSectionScore(section);
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        correct: score.correct,
        total: score.total,
        percentage: score.percentage,
      };
    });

    const totalCorrect = sectionScores.reduce(
      (sum, item) => sum + item.correct,
      0,
    );
    const totalQuestions = sectionScores.reduce(
      (sum, item) => sum + item.total,
      0,
    );
    const totalPercentage =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    return {
      examType,
      difficulty,
      sectionScores,
      totalCorrect,
      totalQuestions,
      totalPercentage,
      sections: finalSections,
      answers,
    };
  };

  const parseSection = (
    type: ExamType,
    sectionId: string,
    data: any,
  ): SimulationSection => {
    const activeTemplates = EXAM_TEMPLATES[type];
    if (type === "toefl" && sectionId === "listening") {
      const partOrder = [
        data.partA,
        data.partB,
        data.partC,
        data.partD,
        data.partE,
      ];
      const allQuestions = partOrder
        .flatMap((part) =>
          Array.isArray(part?.questions) ? part.questions : [],
        )
        .filter(Boolean)
        .map((question: any, index: number) => toQuestion(question, index));
      const listeningScripts = partOrder
        .map((part) => part?.audioScript)
        .filter((s) => typeof s === "string");
      const template = activeTemplates.find((s) => s.id === sectionId)!;
      const listeningTracks = TOEFL_LISTENING_PARTS.map((part, idx) => ({
        label: part.label,
        start: part.start,
        end: part.end,
        script: listeningScripts[idx] || "",
      })).filter((track) => track.script);
      return {
        ...template,
        questions: allQuestions,
        rawQuestions: allQuestions,
        listeningScripts,
        listeningTracks,
        status: "done",
      };
    }

    if (type === "ielts" && sectionId === "listening") {
      const partOrder = [data.partA, data.partB, data.partC, data.partD].filter(
        Boolean,
      );
      const sectionsData = partOrder.length ? partOrder : data.sections || [];
      const sectionsWithPartMeta = sectionsData.map(
        (sectionData: any, idx: number) => ({
          ...sectionData,
          questions: (sectionData.questions || []).map(
            (q: any, qIdx: number) => ({
              ...q,
              questionNumber: idx * 10 + qIdx + 1,
              questionText:
                q.questionText ||
                q.question ||
                `Question ${idx * 10 + qIdx + 1}`,
              options: Array.isArray(q.options) ? q.options : undefined,
              correctAnswer:
                typeof q.correctAnswer === "number"
                  ? q.correctAnswer
                  : undefined,
              explanation: q.explanation || q.paraphrasing || undefined,
            }),
          ),
        }),
      );
      const flatQuestions = sectionsWithPartMeta.flatMap(
        (section: any) => section.questions || [],
      );
      const listeningScripts = sectionsWithPartMeta
        .map((section: any) => section.audioScript)
        .filter((s: unknown) => typeof s === "string");
      const template = activeTemplates.find((s) => s.id === sectionId)!;
      const listeningTracks = IELTS_LISTENING_PARTS.map((part, idx) => ({
        label: part.label,
        start: part.start,
        end: part.end,
        script: listeningScripts[idx] || "",
      })).filter((track) => track.script);
      const mappedQuestions = flatQuestions.map(
        (question: any, index: number) => toQuestion(question, index),
      );
      return {
        ...template,
        questions: mappedQuestions,
        rawQuestions: flatQuestions,
        listeningScripts,
        listeningTracks,
        status: "done",
      };
    }

    if (type === "ielts" && sectionId === "writing") {
      const template = activeTemplates.find((s) => s.id === sectionId)!;
      const task1 = data?.task1;
      const task2 = data?.task2;

      const task1Text =
        task1?.questionText || task1?.instructions || "Writing Task 1";
      const task2Text =
        task2?.prompt?.question || task2?.questionText || "Writing Task 2";

      const writingQuestions: SimulationQuestion[] = [
        {
          id: "q-1",
          number: 1,
          text: task1Text,
          type: "text",
          explanation: task1?.sampleAnswer?.examinerComments,
          details: {
            instructions: task1?.instructions,
            questionText: task1?.questionText,
            visualData: {
              chartType: task1?.visualData?.chartType,
              title: task1?.visualData?.title,
              xAxisLabel: task1?.visualData?.xAxisLabel,
              yAxisLabel: task1?.visualData?.yAxisLabel,
              categories: task1?.visualData?.categories,
              series: task1?.visualData?.series,
              units: task1?.visualData?.units,
              keyFeatures: task1?.visualData?.keyFeatures,
            },
            rubricFocus: task1?.rubricFocus,
            sampleAnswer: {
              bandScore: task1?.sampleAnswer?.bandScore,
              content: task1?.sampleAnswer?.content,
              examinerComments: task1?.sampleAnswer?.examinerComments,
            },
          },
        },
        {
          id: "q-2",
          number: 2,
          text: task2Text,
          type: "text",
          explanation: task2?.sampleAnswer?.examinerComments,
          details: {
            instructions: task2?.instructions,
            statement: task2?.prompt?.statement,
            questionText: task2?.prompt?.question || task2?.questionText,
            rubricFocus: task2?.rubricFocus,
            sampleAnswer: {
              bandScore: task2?.sampleAnswer?.bandScore,
              content: task2?.sampleAnswer?.content,
              examinerComments: task2?.sampleAnswer?.examinerComments,
            },
          },
        },
      ];

      return {
        ...template,
        questions: writingQuestions,
        rawQuestions: [task1, task2].filter(Boolean),
        listeningScripts: [],
        listeningTracks: [],
        status: "done",
      };
    }

    const template = activeTemplates.find((s) => s.id === sectionId)!;
    const questionList = Array.isArray(data.questions)
      ? data.questions
      : [data];

    const passages =
      data?.passages && data.passages.length > 0
        ? data.passages
        : data?.passage
          ? [data.passage]
          : undefined;
    const mappedQuestions = questionList.map((question: any, index: number) =>
      toQuestion(question, index),
    );

    const normalizedPassages = passages?.map((p: any, idx: number) => ({
      title: p?.title || `Passage ${idx + 1}`,
      content: p?.content || "",
      questionStart:
        typeof p?.questionStart === "number" ? p.questionStart : idx * 10 + 1,
      questionEnd:
        typeof p?.questionEnd === "number" ? p.questionEnd : idx * 10 + 10,
    }));

    return {
      ...template,
      questions: mappedQuestions,
      rawQuestions: questionList,
      listeningScripts: [],
      listeningTracks: [],
      passageTitle: data?.passage?.title,
      passageContent: data?.passage?.content,
      passages: normalizedPassages,
      status: "done",
    };
  };

  const generateToeflListeningIncremental = async (
    sectionIndex: number,
    startPartIndex: number,
  ) => {
    const partial =
      startPartIndex === 0 ? {} : { ...toeflListeningPartialRef.current };

    if (startPartIndex === 0) {
      toeflListeningPartialRef.current = {};
      setFailedListeningPartIndex(null);
      updateSection(sectionIndex, {
        questions: [],
        rawQuestions: [],
        listeningScripts: [],
        listeningTracks: [],
        status: "generating",
      });
    }

    for (
      let idx = startPartIndex;
      idx < TOEFL_LISTENING_PARTS.length;
      idx += 1
    ) {
      const part = TOEFL_LISTENING_PARTS[idx];
      setProgress(`Generating TOEFL Listening ${part.label}...`);

      try {
        const result = await streamGenerate(
          part.endpoint,
          difficulty,
          {},
          setProgress,
        );
        partial[part.key] = result;
        toeflListeningPartialRef.current = { ...partial };

        const partBReady = Boolean(partial.partB);
        if (partBReady) {
          const parsed = parseSection("toefl", "listening", partial);
          updateSection(sectionIndex, { ...parsed, status: "generating" });

          if (remainingSeconds === 0) {
            const template = templates.find((s) => s.id === "listening");
            if (template) setRemainingSeconds(template.durationMinutes * 60);
          }
        } else {
          updateSection(sectionIndex, {
            questions: [],
            rawQuestions: [],
            listeningScripts: [],
            listeningTracks: [],
            status: "generating",
          });
        }

        setFailedListeningPartIndex(null);
      } catch (err) {
        if (idx >= 1) setFailedListeningPartIndex(idx);
        throw err;
      }
    }

    setFailedListeningPartIndex(null);
    return partial;
  };

  const generateIeltsListeningIncremental = async (
    sectionIndex: number,
    startPartIndex: number,
  ) => {
    const partial =
      startPartIndex === 0 ? {} : { ...ieltsListeningPartialRef.current };

    if (startPartIndex === 0) {
      ieltsListeningPartialRef.current = {};
      setFailedListeningPartIndex(null);
      updateSection(sectionIndex, {
        questions: [],
        rawQuestions: [],
        listeningScripts: [],
        listeningTracks: [],
        status: "generating",
      });
    }

    for (
      let idx = startPartIndex;
      idx < IELTS_LISTENING_PARTS.length;
      idx += 1
    ) {
      const part = IELTS_LISTENING_PARTS[idx];
      setProgress(`Generating IELTS Listening ${part.label}...`);

      try {
        const result = await streamGenerate(
          part.endpoint,
          difficulty,
          { section: part.section },
          setProgress,
        );
        partial[part.key] = result;
        ieltsListeningPartialRef.current = { ...partial };

        const partBReady = Boolean(partial.partB);
        if (partBReady) {
          const parsed = parseSection("ielts", "listening", partial);
          updateSection(sectionIndex, { ...parsed, status: "generating" });

          if (remainingSeconds === 0) {
            const template = templates.find((s) => s.id === "listening");
            if (template) setRemainingSeconds(template.durationMinutes * 60);
          }
        } else {
          updateSection(sectionIndex, {
            questions: [],
            rawQuestions: [],
            listeningScripts: [],
            listeningTracks: [],
            status: "generating",
          });
        }

        setFailedListeningPartIndex(null);
      } catch (err) {
        if (idx >= 1) setFailedListeningPartIndex(idx);
        throw err;
      }
    }

    setFailedListeningPartIndex(null);
    return partial;
  };

  const generateSection = async (
    type: ExamType,
    sectionId: string,
    sectionIndex: number,
    startPartIndex = 0,
  ) => {
    if (type === "toefl" && sectionId === "listening") {
      return generateToeflListeningIncremental(sectionIndex, startPartIndex);
    }

    if (type === "toefl" && sectionId === "reading") {
      return streamGenerate("/toefl/reading", difficulty, {}, setProgress);
    }

    if (type === "toefl" && sectionId === "structure") {
      return streamGenerate("/toefl/structure", difficulty, {}, setProgress);
    }

    if (type === "ielts" && sectionId === "listening") {
      return generateIeltsListeningIncremental(sectionIndex, startPartIndex);
    }

    if (type === "ielts" && sectionId === "reading") {
      return streamGenerate("/ielts/reading", difficulty, {}, setProgress);
    }

    if (type === "ielts" && sectionId === "writing") {
      setProgress("Generating IELTS Writing Task 1...");
      const task1 = await streamGenerate(
        "/ielts/writing/task-1",
        difficulty,
        {},
        setProgress,
      );
      setProgress("Generating IELTS Writing Task 2...");
      const task2 = await streamGenerate(
        "/ielts/writing/task-2",
        difficulty,
        {},
        setProgress,
      );
      return { task1, task2 };
    }

    return streamGenerate("/ielts/writing/task-2", difficulty, {}, setProgress);
  };

  const detectResumePoint = (
    resumedSections: SimulationSection[],
    resumedExamType: ExamType,
    resumedFailedListeningPartIndex: number | null,
  ) => {
    const startIndex = resumedSections.findIndex(
      (section) => section.status !== "done" && section.status !== "skipped",
    );

    if (startIndex < 0) {
      return null;
    }

    let listeningStartPartIndex: number | undefined;
    const targetSection = resumedSections[startIndex];

    if (targetSection?.id === "listening") {
      const partial =
        resumedExamType === "toefl"
          ? toeflListeningPartialRef.current
          : ieltsListeningPartialRef.current;

      const partDefs =
        resumedExamType === "toefl"
          ? TOEFL_LISTENING_PARTS
          : IELTS_LISTENING_PARTS;

      if (
        typeof resumedFailedListeningPartIndex === "number" &&
        resumedFailedListeningPartIndex >= 1
      ) {
        listeningStartPartIndex = resumedFailedListeningPartIndex;
      } else {
        const firstMissing = partDefs.findIndex((part) => !partial[part.key]);
        listeningStartPartIndex = firstMissing >= 0 ? firstMissing : 0;
      }
    }

    return {
      startIndex,
      listeningStartPartIndex,
    };
  };

  const processSectionsFrom = async (
    startIndex: number,
    options?: {
      listeningStartPartIndex?: number;
      examTypeOverride?: ExamType;
      templatesOverride?: SectionTemplate[];
    },
  ) => {
    const activeExamType = options?.examTypeOverride ?? examType;
    const activeTemplates = options?.templatesOverride ?? templates;

    setIsGenerating(true);
    setLoading(true);
    setFailedSectionIndex(null);
    setError(null);

    for (let i = startIndex; i < activeTemplates.length; i += 1) {
      if (sections[i]?.status === "done" || sections[i]?.status === "skipped")
        continue;

      updateSection(i, { status: "generating", error: undefined });
      try {
        const listeningStartPartIndex =
          i === 0 && activeTemplates[i].id === "listening"
            ? (options?.listeningStartPartIndex ?? 0)
            : 0;

        const raw = await generateSection(
          activeExamType,
          activeTemplates[i].id,
          i,
          listeningStartPartIndex,
        );
        const parsed = parseSection(activeExamType, activeTemplates[i].id, raw);
        updateSection(i, parsed);

        if (i === 0 && remainingSeconds === 0) {
          setRemainingSeconds(parsed.durationMinutes * 60);
        }

        if (
          i === currentSectionIndex &&
          currentQuestionIndex >= parsed.questions.length
        ) {
          setCurrentQuestionIndex(0);
        }

        setProgress(
          `Section ${i + 1}/${activeTemplates.length} (${parsed.title}) is ready`,
        );
      } catch (err) {
        const message = (err as Error).message;
        updateSection(i, { status: "failed", error: message });
        setFailedSectionIndex(i);
        setError(message);
        setProgress(`Failed to generate ${activeTemplates[i].title}`);
        setIsGenerating(false);
        setLoading(false);
        return;
      }
    }

    setProgress("All sections have been generated");
    setIsGenerating(false);
    setLoading(false);
  };

  const resumeSimulationSession = async () => {
    if (!recoverableSessionPayload) return;

    const resumedExamType = recoverableSessionPayload.examType;
    const resumedSections = recoverableSessionPayload.sections || [];
    const resumedFailedListeningPartIndex =
      recoverableSessionPayload.failedListeningPartIndex;

    toeflListeningPartialRef.current =
      recoverableSessionPayload.toeflListeningPartial || {};
    ieltsListeningPartialRef.current =
      recoverableSessionPayload.ieltsListeningPartial || {};

    setExamType(recoverableSessionPayload.examType);
    setDifficulty(recoverableSessionPayload.difficulty);
    setStarted(recoverableSessionPayload.started);
    setSections(resumedSections);
    setCurrentSectionIndex(recoverableSessionPayload.currentSectionIndex || 0);
    setCurrentQuestionIndex(
      recoverableSessionPayload.currentQuestionIndex || 0,
    );
    setRemainingSeconds(recoverableSessionPayload.remainingSeconds || 0);
    setAnswers(recoverableSessionPayload.answers || {});
    setFailedSectionIndex(recoverableSessionPayload.failedSectionIndex);
    setFailedListeningPartIndex(resumedFailedListeningPartIndex);
    setProgress(recoverableSessionPayload.progress || "Session resumed");
    setError(recoverableSessionPayload.error || null);
    setSessionActive(true);
    setRecoverableSessionPayload(null);

    const resumePoint = detectResumePoint(
      resumedSections,
      resumedExamType,
      resumedFailedListeningPartIndex,
    );

    if (resumePoint) {
      setProgress("Continuing generation for unfinished sections...");
      await processSectionsFrom(resumePoint.startIndex, {
        listeningStartPartIndex: resumePoint.listeningStartPartIndex,
        examTypeOverride: resumedExamType,
        templatesOverride: EXAM_TEMPLATES[resumedExamType],
      });
    }
  };

  const exitCurrentSession = async () => {
    try {
      await idbDeleteSession();
    } catch {}

    setSessionActive(false);
    setRecoverableSessionPayload(null);
    setStarted(false);
    setSections([]);
    setAnswers({});
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setRemainingSeconds(0);
    setFailedSectionIndex(null);
    setFailedListeningPartIndex(null);
    setProgress("");
    setError(null);
  };

  const startSimulation = async () => {
    const initialSections: SimulationSection[] = templates.map((template) => ({
      ...template,
      questions: [],
      rawQuestions: [],
      listeningScripts: [],
      listeningTracks: [],
      status: "pending",
    }));

    toeflListeningPartialRef.current = {};
    ieltsListeningPartialRef.current = {};
    setFailedListeningPartIndex(null);
    setSections(initialSections);
    setStarted(true);
    setAnswers({});
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setRemainingSeconds(0);
    setProgress("Initializing simulation...");

    setSessionActive(true);

    const seedPayload: SimulationSessionPayload = {
      examType,
      difficulty,
      started: true,
      sections: initialSections,
      currentSectionIndex: 0,
      currentQuestionIndex: 0,
      remainingSeconds: 0,
      answers: {},
      failedSectionIndex: null,
      failedListeningPartIndex: null,
      progress: "Initializing simulation...",
      error: null,
      toeflListeningPartial: {},
      ieltsListeningPartial: {},
    };

    await persistSession(seedPayload);
    await processSectionsFrom(0);
  };

  const retryFailedSection = async () => {
    if (failedSectionIndex === null) return;

    if (
      failedSectionIndex === 0 &&
      templates[failedSectionIndex]?.id === "listening" &&
      failedListeningPartIndex !== null &&
      failedListeningPartIndex >= 1
    ) {
      await processSectionsFrom(failedSectionIndex, {
        listeningStartPartIndex: failedListeningPartIndex,
      });
      return;
    }

    await processSectionsFrom(failedSectionIndex);
  };

  const skipFailedSection = async () => {
    if (failedSectionIndex === null) return;

    if (
      failedSectionIndex === 0 &&
      templates[failedSectionIndex]?.id === "listening"
    ) {
      toeflListeningPartialRef.current = {};
      ieltsListeningPartialRef.current = {};
      setFailedListeningPartIndex(null);
    }

    updateSection(failedSectionIndex, {
      status: "skipped",
      error: undefined,
      questions: [],
      rawQuestions: [],
      listeningScripts: [],
      listeningTracks: [],
    });
    const next = failedSectionIndex + 1;
    setFailedSectionIndex(null);
    setError(null);
    setProgress(`Section skipped, continuing to section ${next + 1}`);
    if (next < templates.length) {
      await processSectionsFrom(next);
    }
  };

  const goToNextSection = () => {
    if (isLastSection) {
      if (!allSectionsGenerated) return;
      setNextFlowAction("finish");
      setShowNextSectionModal(true);
      return;
    }

    if (!currentSectionReady) return;
    setNextFlowAction("next");
    setShowNextSectionModal(true);
  };

  const confirmNextSection = async () => {
    setShowNextSectionModal(false);
    if (!currentSection) return;

    const action = nextFlowAction;
    setNextFlowAction(null);

    if (action === "finish") {
      const evaluatedSections = await evaluateIeltsWriting(sections);
      const resultData = buildResultData(evaluatedSections);
      try {
        sessionStorage.setItem("simulation-result", JSON.stringify(resultData));
      } catch {}

      try {
        await idbDeleteSession();
      } catch {}
      setSessionActive(false);

      router.push("/result");
      return;
    }

    if (action === "next") {
      const nextIndex = currentSectionIndex + 1;
      if (nextIndex < sections.length) {
        setCurrentSectionIndex(nextIndex);
        setCurrentQuestionIndex(0);
        setRemainingSeconds(sections[nextIndex].durationMinutes * 60);
      }
    }
  };

  const onAnswer = (value: string) => {
    if (!currentSection || !currentQuestion) return;
    const key = `${currentSection.id}:${currentQuestion.id}`;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!sessionActive || !started) return;

    if (persistDebounceRef.current) {
      window.clearTimeout(persistDebounceRef.current);
    }

    persistDebounceRef.current = window.setTimeout(() => {
      const payload = buildSessionPayload();
      persistSession(payload);
    }, 1200);

    return () => {
      if (persistDebounceRef.current) {
        window.clearTimeout(persistDebounceRef.current);
      }
    };
  }, [
    sessionActive,
    started,
    sections,
    currentSectionIndex,
    currentQuestionIndex,
    remainingSeconds,
    answers,
    failedSectionIndex,
    failedListeningPartIndex,
    progress,
    error,
  ]);

  useEffect(() => {
    if (!sessionActive || !started) return;

    const flush = () => {
      const payload = buildSessionPayload();
      void persistSession(payload);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    sessionActive,
    started,
    sections,
    currentSectionIndex,
    currentQuestionIndex,
    remainingSeconds,
    answers,
    failedSectionIndex,
    failedListeningPartIndex,
    progress,
    error,
  ]);

  const selectedAnswer =
    currentSection && currentQuestion
      ? answers[`${currentSection.id}:${currentQuestion.id}`] || ""
      : "";
  const mapTotal =
    currentSection?.id === "listening"
      ? currentSection.targetQuestionCount
      : currentSection?.questions.length || 0;

  const generatedSections = sections.filter(
    (section) => section.status === "done" || section.status === "skipped",
  ).length;
  const generatedPercent = sections.length
    ? Math.round((generatedSections / sections.length) * 100)
    : 0;
  const answeredPercent = currentSection?.questions.length
    ? Math.round((answeredCount / currentSection.questions.length) * 100)
    : 0;

  const getSectionProgress = (section: SimulationSection) => {
    const answered = Object.entries(answers).filter(
      ([key, value]) => key.startsWith(`${section.id}:`) && value.trim(),
    ).length;
    const total = Math.max(
      1,
      section.targetQuestionCount || section.questions.length || 1,
    );
    const percentage = Math.min(100, Math.round((answered / total) * 100));
    return { answered, total, percentage };
  };

  const ttsProgressPercent = ttsEstimatedSeconds
    ? Math.min(100, Math.round((ttsElapsedSeconds / ttsEstimatedSeconds) * 100))
    : 0;

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-7">
      {!started && (
        <section className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-[var(--color-neutral-700)]">
              Simulation Type
            </span>
            <button
              onClick={() => setExamType("toefl")}
              className={`rounded-[10px] px-5 py-2.5 text-sm font-semibold transition ${
                examType === "toefl"
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)]"
              }`}
            >
              TOEFL
            </button>
            <button
              onClick={() => setExamType("ielts")}
              className={`rounded-[10px] px-5 py-2.5 text-sm font-semibold transition ${
                examType === "ielts"
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)]"
              }`}
            >
              IELTS
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-[var(--color-neutral-700)]">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-2 text-sm"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div className="mb-5 space-y-2">
            {templates.map((s, idx) => (
              <div
                key={s.id}
                className="rounded-xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-4 py-3 text-sm"
              >
                <span className="font-semibold text-[var(--color-primary)]">
                  {idx + 1}. {s.title}
                </span>{" "}
                — {s.durationMinutes} minutes — target {s.targetQuestionCount}{" "}
                questions
              </div>
            ))}
          </div>

          {recoverableSessionPayload ? (
            <div className="mb-4 rounded-[10px] border border-[#fdba74] bg-[#fff7ed] p-3">
              <p className="mb-2 mt-0 text-sm text-[var(--color-neutral-700)]">
                Your previous session is still active (up to 3 hours). Continue
                or exit to start a new session.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resumeSimulationSession}
                  className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Resume Session
                </button>
                <button
                  onClick={exitCurrentSession}
                  className="rounded-[10px] bg-[#9a3412] px-4 py-2 text-sm font-semibold text-white"
                >
                  Exit Session
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={startSimulation}
            disabled={loading || !!recoverableSessionPayload}
            className="rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Preparing simulation..." : "Start Full Simulation"}
          </button>
          {loading && <p className="mt-3 text-sm">Progress: {progress}</p>}
          {error && (
            <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>
          )}
        </section>
      )}

      {started && currentSection && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-4 shadow-sm">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((section, idx) => {
                const sectionProgress = getSectionProgress(section);
                const isActive = idx === currentSectionIndex;
                const progressDeg = Math.max(
                  0,
                  Math.min(360, sectionProgress.percentage * 3.6),
                );

                return (
                  <div
                    key={section.id}
                    className="rounded-xl p-[2px]"
                    style={{
                      background: `conic-gradient(from -90deg, var(--color-primary) 0deg ${progressDeg}deg, var(--color-neutral-300) ${progressDeg}deg 360deg)`,
                    }}
                  >
                    <div
                      className={`rounded-[10px] px-3 py-3 text-sm ${
                        isActive ? "bg-[var(--color-primary-pale)]" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-2xl text-[var(--color-primary)]">
                            {idx + 1}.
                          </div>
                          <div>
                            <div className="font-semibold text-[var(--color-neutral-900)]">
                              {section.title}
                            </div>
                            <div className="text-xs text-[var(--color-neutral-500)]">
                              {section.questions.length ===
                              section.targetQuestionCount
                                ? "All Generated"
                                : "Generating"}
                            </div>
                          </div>
                        </div>
                        <div
                          className="text-sm font-semibold text-[var(--color-primary)]"
                          style={{
                            fontFamily:
                              '"JetBrains Mono", "Fira Code", monospace',
                          }}
                        >
                          {sectionProgress.percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <section className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-[var(--color-neutral-900)]">
                  {currentSection.title}
                </h2>
                <p className="text-sm text-[var(--color-neutral-500)]">
                  Question{" "}
                  {Math.min(
                    currentQuestionIndex + 1,
                    Math.max(1, currentSection.questions.length),
                  )}{" "}
                  of {currentSection.questions.length}
                </p>
              </div>

              {currentSection.id === "listening" && activeListeningTrack && (
                <div className="mb-4 rounded-[10px] border border-[#dbe5ff] bg-[#f6f8ff] p-3">
                  <p className="mb-2 mt-0 text-sm font-semibold text-[var(--color-neutral-700)]">
                    {activeListeningTrack.label} (Questions{" "}
                    {activeListeningTrack.start}-{activeListeningTrack.end})
                  </p>
                  <div className="flex items-center gap-2">
                    {ttsPlaying ? (
                      <button
                        onClick={stopTts}
                        disabled={!ttsPlaying}
                        aria-label="Stop TTS"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-neutral-300)] bg-white text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => playTts(activeListeningTrack.script)}
                        disabled={
                          ttsPlaying || (!!ttsUnavailableReason && ttsPermissionAccepted)
                        }
                        aria-label="Play TTS"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-neutral-300)] bg-white text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M8 5v14l11-7-11-7z" />
                        </svg>
                      </button>
                    )}
                    <div className="w-full">
                      <div className="mb-1 w-full flex items-center justify-end text-xs text-[var(--color-neutral-500)]">
                        <span>
                          {ttsElapsedSeconds} sec / {ttsEstimatedSeconds || 0}{" "}
                          sec
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-neutral-100)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                          style={{ width: `${ttsProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {ttsUnavailableReason && (
                    <p className="mt-2 text-xs text-[var(--color-danger)]">
                      {ttsUnavailableReason}
                    </p>
                  )}
                  {!ttsPermissionAccepted && !ttsUnavailableReason && (
                    <p className="mt-2 text-xs text-[var(--color-neutral-500)]">
                      Enable TTS permission to play listening audio guidance.
                    </p>
                  )}
                </div>
              )}

              {currentSection.status !== "done" && (
                <p className="mb-4 rounded-[10px] bg-[var(--color-neutral-50)] p-3 text-sm text-[var(--color-neutral-500)]">
                  This section is still being processed. Questions that are
                  already generated can still be answered.
                </p>
              )}

              {currentSection.id === "reading" &&
                currentSection.passages &&
                currentSection.passages.length > 1 && (
                  <div className="mb-4">
                    {(() => {
                      const currentQuestionNum = currentQuestionIndex + 1;
                      const activePassageIdx =
                        currentSection.passages.findIndex(
                          (p) =>
                            currentQuestionNum >= (p.questionStart ?? 1) &&
                            currentQuestionNum <=
                              (p.questionEnd ??
                                currentSection.questions.length),
                        );

                      if (
                        activePassageIdx === -1 ||
                        !currentSection.passages?.[activePassageIdx]
                      )
                        return null;

                      const passage = currentSection.passages[activePassageIdx];
                      const start = passage.questionStart ?? 1;
                      const end =
                        passage.questionEnd ?? currentSection.questions.length;

                      return (
                        <div
                          key={activePassageIdx}
                          className="rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-3"
                        >
                          <p className="mb-2 mt-0 text-sm font-semibold text-[var(--color-neutral-900)]">
                            Passage {activePassageIdx + 1}: {passage.title}{" "}
                            (Questions {start}-{end})
                          </p>
                          <div className="max-h-60 overflow-auto">
                            <p className="mb-0 whitespace-pre-wrap text-sm leading-7 text-[var(--color-neutral-700)]">
                              {passage.content}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

              {currentSection.id === "reading" &&
                currentSection.passageContent &&
                (!currentSection.passages ||
                  currentSection.passages.length <= 1) && (
                  <div className="mb-4 max-h-60 overflow-auto rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-3">
                    {currentSection.passageTitle && (
                      <p className="mb-2 mt-0 text-sm font-semibold text-[var(--color-neutral-900)]">
                        {currentSection.passageTitle}
                      </p>
                    )}
                    <p className="mb-0 whitespace-pre-wrap text-sm leading-7 text-[var(--color-neutral-700)]">
                      {currentSection.passageContent}
                    </p>
                  </div>
                )}

              {currentQuestion && (
                <div>
                  <p className="mb-4 text-base font-semibold leading-7 text-[var(--color-neutral-900)]">
                    {currentQuestion.text}
                  </p>

                  {currentQuestion.details?.statement && (
                    <p className="mb-3 whitespace-pre-wrap text-sm text-[var(--color-neutral-700)]">
                      <strong>Statement:</strong>{" "}
                      {currentQuestion.details.statement}
                    </p>
                  )}

                  {currentQuestion.details?.questionText && (
                    <p className="mb-3 whitespace-pre-wrap text-sm text-[var(--color-neutral-700)]">
                      <strong>Question:</strong>{" "}
                      {currentQuestion.details.questionText}
                    </p>
                  )}

                  {currentQuestion.details?.visualData && (
                    <WritingVisual
                      visualData={currentQuestion.details.visualData}
                    />
                  )}

                  {currentQuestion.details?.instructions && (
                    <p className="mb-3 text-xs text-slate-600">
                      <strong>Note:</strong>{" "}
                      {currentQuestion.details.instructions}
                    </p>
                  )}

                  {currentQuestion.options?.length ? (
                    <div className="grid gap-2">
                      {currentQuestion.options.map((opt, idx) => {
                        const selected = selectedAnswer === String(idx);
                        return (
                          <label
                            key={`${currentQuestion.id}-${idx}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3 text-sm transition ${
                              selected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)] text-[var(--color-primary)]"
                                : "border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-700)] hover:border-[var(--color-primary-light)] hover:bg-[var(--color-primary-pale)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              checked={selected}
                              onChange={() => onAnswer(String(idx))}
                              className="mt-0.5"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea
                      value={selectedAnswer}
                      onChange={(e) => onAnswer(e.target.value)}
                      placeholder="Write your answer..."
                      className="min-h-[120px] w-full rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] p-3 text-sm"
                    />
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={
                    currentQuestionIndex === 0 ||
                    currentSection.questions.length === 0
                  }
                  className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-neutral-700)] disabled:opacity-60"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(currentSection.questions.length - 1, prev + 1),
                    )
                  }
                  disabled={
                    currentQuestionIndex >=
                      currentSection.questions.length - 1 ||
                    currentSection.questions.length === 0
                  }
                  className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-neutral-700)] disabled:opacity-60"
                >
                  Next
                </button>
              </div>

              <div className="mt-4">
                {!isLastSection && (
                  <button
                    onClick={goToNextSection}
                    disabled={!currentSectionReady}
                    className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{
                      background: currentSectionReady
                        ? "var(--color-primary)"
                        : "#9ca3af",
                    }}
                  >
                    Skip Section
                  </button>
                )}
                {isLastSection && (
                  <button
                    onClick={goToNextSection}
                    disabled={!allSectionsGenerated}
                    className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{
                      background: allSectionsGenerated
                        ? "var(--color-accent-dark)"
                        : "#9ca3af",
                    }}
                  >
                    Simulation Completed
                  </button>
                )}
                {!allSectionsGenerated && isLastSection && (
                  <p className="mt-2 text-sm text-[var(--color-danger)]">
                    Wait until all sections are generated before completing the
                    simulation.
                  </p>
                )}
              </div>
            </section>

            <aside className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-4 shadow-sm">
              <div className="mb-5 text-center">
                <p className="mb-1 text-xs text-[var(--color-neutral-500)]">
                  Time
                </p>
                <div
                  className="text-[32px] font-bold text-[var(--color-neutral-900)]"
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  }}
                >
                  {formatTime(remainingSeconds).replace(":", " : ")}
                </div>
                <p className="text-xs text-[var(--color-neutral-500)]">
                  Min : Sec
                </p>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: mapTotal }).map((_, idx) => {
                  const q = currentSection.questions[idx];
                  const disabled = !q;
                  const key = q
                    ? `${currentSection.id}:${q.id}`
                    : `pending-${idx}`;
                  const answered = q ? !!answers[key]?.trim() : false;
                  const isCurrent = idx === currentQuestionIndex;

                  const bubbleClass = disabled
                    ? "border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]"
                    : isCurrent
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : answered
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)] text-[var(--color-primary)]"
                        : "border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-500)]";

                  return (
                    <button
                      key={q?.id || `pending-${idx + 1}`}
                      onClick={() => {
                        if (!disabled) setCurrentQuestionIndex(idx);
                      }}
                      disabled={disabled}
                      className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${bubbleClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {failedSectionIndex !== null && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={retryFailedSection}
                    disabled={isGenerating}
                    className="w-full rounded-[10px] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Retry Failed Section
                  </button>
                  <button
                    onClick={skipFailedSection}
                    disabled={isGenerating}
                    className="w-full rounded-[10px] bg-[#9a3412] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Skip & Continue
                  </button>
                </div>
              )}

              {sessionActive && (
                <button
                  onClick={exitCurrentSession}
                  className="mt-4 w-full rounded-[10px] bg-[#7f1d1d] px-3 py-2 text-xs font-semibold text-white"
                >
                  Exit Session
                </button>
              )}
            </aside>
          </div>
        </section>
      )}

      {showTtsPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-xl font-semibold text-[var(--color-neutral-900)]">
              Enable Text-to-Speech (TTS)?
            </h3>
            <p className="mb-2 text-sm text-[var(--color-neutral-700)]">
              We use device Text-to-Speech to read listening scripts aloud during
              simulation. This helps you practice listening flow with audio-like
              playback.
            </p>
            <p className="mb-5 text-xs text-[var(--color-neutral-500)]">
              If you reject it, simulation still works normally, but TTS playback
              will be disabled.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleRejectTtsPermission}
                className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-neutral-700)]"
              >
                Continue without TTS
              </button>
              <button
                onClick={handleAcceptTtsPermission}
                className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Enable TTS
              </button>
            </div>
          </div>
        </div>
      )}

      {showNextSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[90%] max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-semibold text-[var(--color-neutral-900)]">
                {nextFlowAction === "finish"
                  ? "Finish Simulation?"
                  : "Continue to Next Section?"}
              </h3>
              <p className="mb-5 text-sm text-[var(--color-neutral-700)]">
                {nextFlowAction === "finish"
                  ? "All sections are generated. Continue to view the final result: total score, section breakdown, and answer review with explanations."
                  : `You have answered ${answeredCount} of ${currentSection?.questions.length || 0} questions. Are you sure you want to continue to the next section? Your current answers will be saved.`}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNextSectionModal(false)}
                className="rounded-[10px] border border-[var(--color-neutral-300)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-neutral-700)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmNextSection}
                className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
