import type {
  OfferingAnsweredQuestion,
  OfferingCheckInput,
} from "@/types/offering-check";

export function buildOfferingJudgePrompt(
  input: OfferingCheckInput,
  answers: readonly Pick<
    OfferingAnsweredQuestion,
    "kind" | "question" | "answer"
  >[]
): string {
  return JSON.stringify({
    website: input.domain,
    feature: input.feature || null,
    problem: input.problem || null,
    answers,
  });
}
