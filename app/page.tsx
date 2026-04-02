"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WritingVisual from "./components/WritingVisual";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SESSION_DB_NAME = "wikin2-simulation-db";
const SESSION_STORE_NAME = "sessions";
const SESSION_RECORD_ID = "active-session-v1";
const SESSION_ENCRYPTION_KEY =
  process.env.NEXT_PUBLIC_SESSION_ENCRYPTION_KEY ||
  "wikin2-local-session-encryption";
const LOCAL_SESSION_TTL_MS = 3 * 60 * 60 * 1000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openSessionDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(SESSION_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
        db.createObjectStore(SESSION_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSetSession(data: LocalEncryptedSession) {
  const db = await openSessionDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = tx.objectStore(SESSION_STORE_NAME);
    store.put({ id: SESSION_RECORD_ID, ...data });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetSession(): Promise<LocalEncryptedSession | null> {
  const db = await openSessionDb();
  return await new Promise<LocalEncryptedSession | null>((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE_NAME, "readonly");
    const store = tx.objectStore(SESSION_STORE_NAME);
    const request = store.get(SESSION_RECORD_ID);
    request.onsuccess = () => {
      const value = request.result;
      if (!value) {
        resolve(null);
        return;
      }
      const { id: _id, ...rest } = value;
      resolve(rest as LocalEncryptedSession);
    };
    request.onerror = () => reject(request.error);
  });
}

async function idbDeleteSession() {
  const db = await openSessionDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSION_STORE_NAME, "readwrite");
    const store = tx.objectStore(SESSION_STORE_NAME);
    store.delete(SESSION_RECORD_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deriveLocalSessionKey(salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_ENCRYPTION_KEY),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: Uint8Array.from(salt).buffer,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptLocalSession(payload: SimulationSessionPayload): Promise<LocalEncryptedSession> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLocalSessionKey(salt);
  const plain = encoder.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);

  return {
    v: 1,
    expiresAt: Date.now() + LOCAL_SESSION_TTL_MS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(new Uint8Array(encrypted)),
  };
}

async function decryptLocalSession(data: LocalEncryptedSession): Promise<SimulationSessionPayload | null> {
  if (data.v !== 1) return null;
  if (Date.now() > data.expiresAt) return null;

  const salt = base64ToBytes(data.salt);
  const iv = base64ToBytes(data.iv);
  const cipher = base64ToBytes(data.cipher);
  const key = await deriveLocalSessionKey(salt);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  const text = decoder.decode(decrypted);
  return JSON.parse(text) as SimulationSessionPayload;
}

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type ExamType = "toefl" | "ielts";
type GenerationStatus =
  | "pending"
  | "generating"
  | "done"
  | "failed"
  | "skipped";

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

type ListeningTrack = {
  label: string;
  start: number;
  end: number;
  script: string;
};

type SimulationSection = {
  id: string;
  title: string;
  durationMinutes: number;
  targetQuestionCount: number;
  questions: SimulationQuestion[];
  rawQuestions: any[];
  listeningScripts: string[];
  listeningTracks: ListeningTrack[];
  passageTitle?: string;
  passageContent?: string;
  passages?: { title: string; content: string; questionStart?: number; questionEnd?: number }[];
  status: GenerationStatus;
  error?: string;
};

type SectionTemplate = {
  id: string;
  title: string;
  durationMinutes: number;
  targetQuestionCount: number;
};

type SectionResultSummary = {
  sectionId: string;
  sectionTitle: string;
  correct: number;
  total: number;
  percentage: number;
};

type SimulationResultData = {
  examType: ExamType;
  difficulty: Difficulty;
  sectionScores: SectionResultSummary[];
  totalCorrect: number;
  totalQuestions: number;
  totalPercentage: number;
  sections: SimulationSection[];
  answers: Record<string, string>;
};

type SimulationSessionPayload = {
  examType: ExamType;
  difficulty: Difficulty;
  started: boolean;
  sections: SimulationSection[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  remainingSeconds: number;
  answers: Record<string, string>;
  failedSectionIndex: number | null;
  failedListeningPartIndex: number | null;
  progress: string;
  error: string | null;
  toeflListeningPartial: Record<string, any>;
  ieltsListeningPartial: Record<string, any>;
};

type LocalEncryptedSession = {
  v: 1;
  expiresAt: number;
  salt: string;
  iv: string;
  cipher: string;
};

const EXAM_TEMPLATES: Record<ExamType, SectionTemplate[]> = {
  toefl: [
    {
      id: "listening",
      title: "Listening",
      durationMinutes: 35,
      targetQuestionCount: 50,
    },
    {
      id: "reading",
      title: "Reading",
      durationMinutes: 55,
      targetQuestionCount: 50,
    },
    {
      id: "structure",
      title: "Structure & Written Expression",
      durationMinutes: 25,
      targetQuestionCount: 40,
    },
  ],
  ielts: [
    {
      id: "listening",
      title: "Listening",
      durationMinutes: 30,
      targetQuestionCount: 40,
    },
    {
      id: "reading",
      title: "Reading",
      durationMinutes: 60,
      targetQuestionCount: 40,
    },
    {
      id: "writing",
      title: "Writing",
      durationMinutes: 60,
      targetQuestionCount: 2,
    },
  ],
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

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

const TOEFL_LISTENING_PARTS = [
  {
    key: "partA",
    label: "Part A",
    start: 1,
    end: 5,
    endpoint: "/toefl/listening/part-a",
  },
  {
    key: "partB",
    label: "Part B",
    start: 6,
    end: 12,
    endpoint: "/toefl/listening/part-b",
  },
  {
    key: "partC",
    label: "Part C",
    start: 13,
    end: 25,
    endpoint: "/toefl/listening/part-c",
  },
  {
    key: "partD",
    label: "Part D",
    start: 26,
    end: 35,
    endpoint: "/toefl/listening/part-d",
  },
  {
    key: "partE",
    label: "Part E",
    start: 36,
    end: 50,
    endpoint: "/toefl/listening/part-e",
  },
] as const;

const IELTS_LISTENING_PARTS = [
  {
    key: "partA",
    label: "Part A",
    start: 1,
    end: 10,
    section: "SECTION_1",
    endpoint: "/ielts/listening",
  },
  {
    key: "partB",
    label: "Part B",
    start: 11,
    end: 20,
    section: "SECTION_2",
    endpoint: "/ielts/listening",
  },
  {
    key: "partC",
    label: "Part C",
    start: 21,
    end: 30,
    section: "SECTION_3",
    endpoint: "/ielts/listening",
  },
  {
    key: "partD",
    label: "Part D",
    start: 31,
    end: 40,
    section: "SECTION_4",
    endpoint: "/ielts/listening",
  },
] as const;

async function streamGenerate(
  endpoint: string,
  difficulty: Difficulty,
  body: Record<string, string>,
  onProgress: (message: string) => void,
) {
  return await new Promise<any>((resolve, reject) => {
    const params = new URLSearchParams({ endpoint, difficulty, ...body });
    const source = new EventSource(
      `${API_URL}/api/questions/stream?${params.toString()}`,
    );

    source.addEventListener("progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      onProgress(data.message || "Processing...");
    });

    source.addEventListener("done", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      source.close();
      if (data.success) resolve(data.data);
      else reject(new Error(data.error || "Failed to generate"));
    });

    source.addEventListener("error", (event) => {
      const messageEvent = event as MessageEvent;
      source.close();
      if (messageEvent.data) {
        const data = JSON.parse(messageEvent.data);
        reject(new Error(data.error || "Generation failed"));
      } else {
        reject(new Error("Connection lost during generation"));
      }
    });
  });
}

export default function Home() {
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
  const [showNextSectionModal, setShowNextSectionModal] = useState(false);
  const [nextFlowAction, setNextFlowAction] = useState<"next" | "finish" | null>(null);
  const [failedListeningPartIndex, setFailedListeningPartIndex] = useState<number | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [recoverableSessionPayload, setRecoverableSessionPayload] = useState<SimulationSessionPayload | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
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
    window.speechSynthesis.cancel();
    speechRef.current = null;
    setTtsPlaying(false);
  };

  const playTts = (text: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !text
    )
      return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setTtsPlaying(false);
    utterance.onerror = () => setTtsPlaying(false);
    speechRef.current = utterance;
    setTtsPlaying(true);
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
      const reviewed = section.questions.filter((q) => q.details?.writingReview);
      const total = section.questions.length;

      if (reviewed.length > 0) {
        const avgBand =
          reviewed.reduce((sum, q) => sum + (q.details?.writingReview?.overallBand || 0), 0) /
          reviewed.length;
        return {
          correct: Math.round((avgBand / 9) * 100),
          total: 100,
          percentage: Math.round((avgBand / 9) * 100),
        };
      }

      const answered = section.questions.filter(
        (q) => answers[`${section.id}:${q.id}`]?.trim(),
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

    const writingSection = currentSections.find((section) => section.id === "writing");
    if (!writingSection) return currentSections;

    const reviewedQuestions = await Promise.all(
      writingSection.questions.map(async (q) => {
        const answerKey = `${writingSection.id}:${q.id}`;
        const answer = answers[answerKey] || "";
        const taskRaw = writingSection.rawQuestions?.[q.number - 1] || null;

        if (!taskRaw) return q;

        try {
          const resp = await fetch(`${API_URL}/api/questions/ielts/writing/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: taskRaw, answer }),
          });
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
      section.id === "writing" ? { ...section, questions: reviewedQuestions } : section,
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
      remainingSecondsCheckpoint: Math.floor((payload.remainingSeconds || 0) / 15),
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

  const buildResultData = (finalSections: SimulationSection[] = sections): SimulationResultData => {
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

    const totalCorrect = sectionScores.reduce((sum, item) => sum + item.correct, 0);
    const totalQuestions = sectionScores.reduce((sum, item) => sum + item.total, 0);
    const totalPercentage =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

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
      const partOrder = [data.partA, data.partB, data.partC, data.partD].filter(Boolean);
      const sectionsData = partOrder.length ? partOrder : data.sections || [];
      const sectionsWithPartMeta = sectionsData.map((sectionData: any, idx: number) => ({
        ...sectionData,
        questions: (sectionData.questions || []).map((q: any, qIdx: number) => ({
          ...q,
          questionNumber: idx * 10 + qIdx + 1,
          questionText: q.questionText || q.question || `Question ${idx * 10 + qIdx + 1}`,
          options: Array.isArray(q.options) ? q.options : undefined,
          correctAnswer:
            typeof q.correctAnswer === "number" ? q.correctAnswer : undefined,
          explanation: q.explanation || q.paraphrasing || undefined,
        })),
      }));
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
      questionStart: typeof p?.questionStart === "number" ? p.questionStart : idx * 10 + 1,
      questionEnd: typeof p?.questionEnd === "number" ? p.questionEnd : idx * 10 + 10,
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

    for (let idx = startPartIndex; idx < TOEFL_LISTENING_PARTS.length; idx += 1) {
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

    for (let idx = startPartIndex; idx < IELTS_LISTENING_PARTS.length; idx += 1) {
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
        resumedExamType === "toefl" ? TOEFL_LISTENING_PARTS : IELTS_LISTENING_PARTS;

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
          `Section ${i + 1}/${activeTemplates.length} (${parsed.title}) siap dikerjakan`,
        );
      } catch (err) {
        const message = (err as Error).message;
        updateSection(i, { status: "failed", error: message });
        setFailedSectionIndex(i);
        setError(message);
        setProgress(`Gagal generate ${activeTemplates[i].title}`);
        setIsGenerating(false);
        setLoading(false);
        return;
      }
    }

    setProgress("Semua section selesai digenerate");
    setIsGenerating(false);
    setLoading(false);
  };

  const resumeSimulationSession = async () => {
    if (!recoverableSessionPayload) return;

    const resumedExamType = recoverableSessionPayload.examType;
    const resumedSections = recoverableSessionPayload.sections || [];
    const resumedFailedListeningPartIndex =
      recoverableSessionPayload.failedListeningPartIndex;

    toeflListeningPartialRef.current = recoverableSessionPayload.toeflListeningPartial || {};
    ieltsListeningPartialRef.current = recoverableSessionPayload.ieltsListeningPartial || {};

    setExamType(recoverableSessionPayload.examType);
    setDifficulty(recoverableSessionPayload.difficulty);
    setStarted(recoverableSessionPayload.started);
    setSections(resumedSections);
    setCurrentSectionIndex(recoverableSessionPayload.currentSectionIndex || 0);
    setCurrentQuestionIndex(recoverableSessionPayload.currentQuestionIndex || 0);
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
      setProgress("Melanjutkan generate section yang belum selesai...");
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

    if (failedSectionIndex === 0 && templates[failedSectionIndex]?.id === "listening") {
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
    setProgress(`Section di-skip, lanjut ke section ${next + 1}`);
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
  }, [sessionActive, started, sections, currentSectionIndex, currentQuestionIndex, remainingSeconds, answers, failedSectionIndex, failedListeningPartIndex, progress, error]);

  const selectedAnswer =
    currentSection && currentQuestion
      ? answers[`${currentSection.id}:${currentQuestion.id}`] || ""
      : "";
  const mapTotal =
    currentSection?.id === "listening"
      ? currentSection.targetQuestionCount
      : currentSection?.questions.length || 0;

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: 20 }}>
      <h1 style={{ textAlign: "center", marginBottom: 16 }}>
        TOEFL & IELTS Simulation Platform
      </h1>

      {!started && (
        <div style={{ background: "#f7f7f7", padding: 20, borderRadius: 8 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label>Simulation Type</label>
            <button
              onClick={() => setExamType("toefl")}
              style={{
                ...tabStyle,
                background: examType === "toefl" ? "#0066cc" : "#ddd",
              }}
            >
              TOEFL
            </button>
            <button
              onClick={() => setExamType("ielts")}
              style={{
                ...tabStyle,
                background: examType === "ielts" ? "#cc3300" : "#ddd",
              }}
            >
              IELTS
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <label>Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              style={{ padding: 8, borderRadius: 4 }}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            {templates.map((s, idx) => (
              <div key={s.id} style={{ marginBottom: 8 }}>
                {idx + 1}. {s.title} — {s.durationMinutes} menit — target{" "}
                {s.targetQuestionCount} soal
              </div>
            ))}
          </div>

          {recoverableSessionPayload ? (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, background: "#fff7ed", border: "1px solid #fdba74" }}>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                Session sebelumnya masih aktif (maks 3 jam). Lanjutkan atau keluar untuk mulai session baru.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={resumeSimulationSession} style={startBtnStyle}>Lanjutkan Session</button>
                <button onClick={exitCurrentSession} style={{ ...startBtnStyle, background: "#9a3412" }}>Keluar Session</button>
              </div>
            </div>
          ) : null}

          <button
            onClick={startSimulation}
            disabled={loading || !!recoverableSessionPayload}
            style={startBtnStyle}
          >
            {loading ? "Preparing simulation..." : "Start Full Simulation"}
          </button>
          {loading && <p style={{ marginTop: 10 }}>Progress: {progress}</p>}
          {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
        </div>
      )}

      {started && currentSection && (
        <div
          style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}
        >
          <aside
            style={{ background: "#f7f7f7", padding: 12, borderRadius: 8 }}
          >
            <h3 style={{ marginTop: 0 }}>Section Progress</h3>
            <p style={{ marginTop: 0, fontSize: 13 }}>
              Status: {isGenerating ? "Generating..." : "Idle"}
            </p>
            <p style={{ marginTop: 0, fontSize: 13 }}>Progress: {progress}</p>

            {sections.map((section, idx) => (
              <div
                key={section.id}
                style={{
                  marginBottom: 10,
                  padding: 8,
                  borderRadius: 6,
                  background: idx === currentSectionIndex ? "#e8f1ff" : "white",
                  opacity: idx > currentSectionIndex ? 0.75 : 1,
                }}
              >
                <div>
                  {idx + 1}. {section.title}
                </div>
                <small>
                  {section.questions.length}/{section.targetQuestionCount}{" "}
                  generated — {section.status}
                </small>
                {section.error && (
                  <div style={{ color: "#a33", fontSize: 12, marginTop: 4 }}>
                    {section.error}
                  </div>
                )}
              </div>
            ))}

            {failedSectionIndex !== null && (
              <div style={{ marginBottom: 12 }}>
                <button
                  onClick={retryFailedSection}
                  disabled={isGenerating}
                  style={{ ...startBtnStyle, marginRight: 8 }}
                >
                  Retry Failed Section
                </button>
                <button
                  onClick={skipFailedSection}
                  disabled={isGenerating}
                  style={{ ...startBtnStyle, background: "#9a3412" }}
                >
                  Skip & Continue
                </button>
              </div>
            )}

            {sessionActive && (
              <div style={{ marginBottom: 12 }}>
                <button
                  onClick={exitCurrentSession}
                  style={{ ...startBtnStyle, background: "#7f1d1d" }}
                >
                  Exit Session
                </button>
              </div>
            )}

            <hr />
            <div style={{ marginBottom: 10 }}>
              <strong>Waktu Tersisa:</strong> {formatTime(remainingSeconds)}
            </div>
            <div style={{ marginBottom: 10 }}>
              <strong>Dijawab:</strong> {answeredCount}/
              {currentSection.questions.length}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 6,
              }}
            >
              {Array.from({ length: mapTotal }).map((_, idx) => {
                const q = currentSection.questions[idx];
                const disabled = !q;
                const key = q
                  ? `${currentSection.id}:${q.id}`
                  : `pending-${idx}`;
                const answered = q ? !!answers[key]?.trim() : false;
                return (
                  <button
                    key={q?.id || `pending-${idx + 1}`}
                    onClick={() => {
                      if (!disabled) setCurrentQuestionIndex(idx);
                    }}
                    disabled={disabled}
                    style={{
                      padding: "6px 0",
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      background: disabled
                        ? "#eee"
                        : idx === currentQuestionIndex
                          ? "#2d6cdf"
                          : answered
                            ? "#d4f8d4"
                            : "white",
                      color: disabled
                        ? "#888"
                        : idx === currentQuestionIndex
                          ? "white"
                          : "black",
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </aside>

          <section
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              padding: 16,
              borderRadius: 8,
            }}
          >
            <h2 style={{ marginTop: 0 }}>{currentSection.title}</h2>
            <p>
              Soal{" "}
              {Math.min(
                currentQuestionIndex + 1,
                Math.max(1, currentSection.questions.length),
              )}{" "}
              dari {currentSection.questions.length}
            </p>

            {currentSection.id === "listening" && activeListeningTrack && (
              <div
                style={{
                  marginBottom: 14,
                  padding: 10,
                  background: "#f6f8ff",
                  borderRadius: 6,
                  border: "1px solid #dbe5ff",
                }}
              >
                <p style={{ marginTop: 0, marginBottom: 8 }}>
                  Audio aktif: {activeListeningTrack.label} (Soal{" "}
                  {activeListeningTrack.start}-{activeListeningTrack.end})
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => playTts(activeListeningTrack.script)}
                    disabled={ttsPlaying}
                    style={navBtnStyle}
                  >
                    Play TTS
                  </button>
                  <button
                    onClick={stopTts}
                    disabled={!ttsPlaying}
                    style={navBtnStyle}
                  >
                    Stop TTS
                  </button>
                </div>
              </div>
            )}

            {currentSection.status !== "done" && (
              <p>
                Section ini masih diproses. Soal yang sudah selesai digenerate
                tetap bisa dikerjakan.
              </p>
            )}

            {currentSection.id === "reading" &&
              currentSection.passages &&
              currentSection.passages.length > 1 && (
                <div style={{ marginBottom: 14 }}>
                  {(() => {
                    const currentQuestionNum = currentQuestionIndex + 1;
                    const activePassageIdx = currentSection.passages.findIndex(
                      (p) =>
                        currentQuestionNum >= (p.questionStart ?? 1) &&
                        currentQuestionNum <= (p.questionEnd ?? currentSection.questions.length),
                    );

                    if (
                      activePassageIdx === -1 ||
                      !currentSection.passages?.[activePassageIdx]
                    )
                      return null;

                    const passage = currentSection.passages[activePassageIdx];
                    const start = passage.questionStart ?? 1;
                    const end = passage.questionEnd ?? currentSection.questions.length;

                    return (
                      <div
                        key={activePassageIdx}
                        style={{
                          padding: 10,
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                        }}
                      >
                        <p
                          style={{
                            marginTop: 0,
                            fontWeight: 700,
                            marginBottom: 8,
                          }}
                        >
                          Passage {activePassageIdx + 1}: {passage.title}{" "}
                          (Questions {start}-{end})
                        </p>
                        <div style={{ maxHeight: 240, overflow: "auto" }}>
                          <p
                            style={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.5,
                              marginBottom: 0,
                            }}
                          >
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
                <div
                  style={{
                    marginBottom: 14,
                    padding: 10,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 6,
                    maxHeight: 240,
                    overflow: "auto",
                  }}
                >
                  {currentSection.passageTitle && (
                    <p style={{ marginTop: 0, fontWeight: 700 }}>
                      {currentSection.passageTitle}
                    </p>
                  )}
                  <p
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                      marginBottom: 0,
                    }}
                  >
                    {currentSection.passageContent}
                  </p>
                </div>
              )}

            {currentQuestion && (
              <div>
                <p style={{ fontWeight: 600 }}>{currentQuestion.text}</p>

                {currentQuestion.details?.statement && (
                  <p style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>
                    <strong>Statement:</strong> {currentQuestion.details.statement}
                  </p>
                )}

                {currentQuestion.details?.questionText && (
                  <p style={{ marginBottom: 10, whiteSpace: "pre-wrap" }}>
                    <strong>Question:</strong> {currentQuestion.details.questionText}
                  </p>
                )}

                {currentQuestion.details?.visualData && (
                  <WritingVisual visualData={currentQuestion.details.visualData} />
                )}

                {currentQuestion.details?.instructions && (
                  <p style={{ marginBottom: 10, fontSize: 12, color: "#475569" }}>
                    <strong>Note:</strong> {currentQuestion.details.instructions}
                  </p>
                )}

                {currentQuestion.options?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {currentQuestion.options.map((opt, idx) => (
                      <label
                        key={`${currentQuestion.id}-${idx}`}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          checked={selectedAnswer === String(idx)}
                          onChange={() => onAnswer(String(idx))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={selectedAnswer}
                    onChange={(e) => onAnswer(e.target.value)}
                    placeholder="Tulis jawaban Anda..."
                    style={{
                      width: "100%",
                      minHeight: 120,
                      padding: 10,
                      borderRadius: 6,
                      border: "1px solid #bbb",
                    }}
                  />
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <button
                onClick={() =>
                  setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={
                  currentQuestionIndex === 0 ||
                  currentSection.questions.length === 0
                }
                style={navBtnStyle}
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
                  currentQuestionIndex >= currentSection.questions.length - 1 ||
                  currentSection.questions.length === 0
                }
                style={navBtnStyle}
              >
                Next
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              {!isLastSection && (
                <button
                  onClick={goToNextSection}
                  disabled={!currentSectionReady}
                  style={{
                    ...startBtnStyle,
                    background: currentSectionReady ? "#0b7a34" : "#aaa",
                  }}
                >
                  Lanjut ke Section Berikutnya
                </button>
              )}
              {isLastSection && (
                <button
                  onClick={goToNextSection}
                  disabled={!allSectionsGenerated}
                  style={{
                    ...startBtnStyle,
                    background: allSectionsGenerated ? "#0b7a34" : "#aaa",
                  }}
                >
                  Simulation Completed
                </button>
              )}
              {!allSectionsGenerated && isLastSection && (
                <p style={{ marginTop: 8, color: "#a33" }}>
                  Tunggu semua section selesai digenerate sebelum menyelesaikan simulasi.
                </p>
              )}
            </div>
          </section>
        </div>
      )}


      {showNextSectionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 12,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>
              {nextFlowAction === "finish"
                ? "Selesaikan Simulasi?"
                : "Lanjut ke Section Berikutnya?"}
            </h3>
            <p style={{ marginBottom: 20, lineHeight: 1.6 }}>
              {nextFlowAction === "finish"
                ? "Semua section sudah selesai digenerate. Lanjutkan untuk melihat hasil akhir: total skor, detail skor per section, dan review jawaban beserta pembahasannya."
                : `Anda telah menjawab ${answeredCount} dari ${currentSection?.questions.length || 0} soal. Yakin ingin melanjutkan ke section berikutnya? Jawaban yang sudah diisi akan tersimpan.`}
            </p>
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowNextSectionModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                onClick={confirmNextSection}
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "#0b7a34",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const tabStyle: React.CSSProperties = {
  color: "white",
  border: "none",
  borderRadius: 5,
  padding: "8px 14px",
  cursor: "pointer",
};

const startBtnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "none",
  background: "#1d4ed8",
  color: "white",
  cursor: "pointer",
};

const navBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "1px solid #bbb",
  background: "white",
  cursor: "pointer",
};
