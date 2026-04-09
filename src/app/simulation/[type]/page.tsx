import { notFound } from "next/navigation";
import { SimulationRunner } from "@/components/organisms/SimulationRunner";
import { ExamType } from "@/types";

type Props = {
  params: Promise<{ type: string }>;
  searchParams?: Promise<{ difficulty?: "EASY" | "MEDIUM" | "HARD" }>;
};

const allowedTypes: ExamType[] = ["toefl", "ielts"];

export default async function SimulationTypePage({ params, searchParams }: Props) {
  const { type } = await params;
  const parsedType = type.toLowerCase() as ExamType;

  if (!allowedTypes.includes(parsedType)) {
    notFound();
  }

  const qs = searchParams ? await searchParams : undefined;
  const difficulty =
    qs?.difficulty === "EASY" || qs?.difficulty === "HARD" || qs?.difficulty === "MEDIUM"
      ? qs.difficulty
      : "MEDIUM";

  return <SimulationRunner examType={parsedType} initialDifficulty={difficulty} />;
}
