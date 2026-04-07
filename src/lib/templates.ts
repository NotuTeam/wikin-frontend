import { ExamType, SectionTemplate } from "@/types";

export const EXAM_TEMPLATES: Record<ExamType, SectionTemplate[]> = {
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

export const TOEFL_LISTENING_PARTS = [
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

export const IELTS_LISTENING_PARTS = [
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
