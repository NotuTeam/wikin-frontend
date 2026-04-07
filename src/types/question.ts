import { WritingReview } from "./review";
import { VisualData } from "./visual";

export type QuestionType = "mcq" | "text";

export type QuestionDetails = {
  instructions?: string;
  statement?: string;
  questionText?: string;
  visualData?: VisualData;
  rubricFocus?: string[];
  sampleAnswer?: {
    bandScore?: number;
    content?: string;
    examinerComments?: string;
  };
  writingReview?: WritingReview;
};

export type SimulationQuestion = {
  id: string;
  number: number;
  text: string;
  options?: string[];
  type: QuestionType;
  correctAnswer?: number;
  explanation?: string;
  details?: QuestionDetails;
};
