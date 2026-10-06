import {
  OFFERING_QUESTION_TITLES,
  OFFERING_SENTENCE_END_PATTERN,
} from "@/constants/offering-check";
import type {
  OfferingCheckInput,
  OfferingQuestion,
  OfferingQuestionKind,
} from "@/types/offering-check";

/**
 * The name question always runs. With a problem, a second question describes
 * the need the way a buyer would, without the feature name.
 */
export function buildOfferingQuestions(
  input: OfferingCheckInput
): OfferingQuestion[] {
  if (input.feature.length === 0) {
    return [
      {
        kind: "name",
        text: `What does ${input.domain} offer? List its main products and features and say briefly what each one does.`,
      },
    ];
  }
  const feature = input.feature.replaceAll('"', "");
  const questions: OfferingQuestion[] = [
    {
      kind: "name",
      text: `Does ${input.domain} offer a feature called "${feature}"? What does it do? If you do not know it, tell me what they offer instead.`,
    },
  ];
  if (input.problem.length > 0) {
    const problem = OFFERING_SENTENCE_END_PATTERN.test(input.problem)
      ? input.problem
      : `${input.problem}.`;
    questions.push({
      kind: "problem",
      text: `I use ${input.domain}. ${problem} What in ${input.domain} can I use for this?`,
    });
  }
  return questions;
}

export function offeringQuestionTitle(
  kind: OfferingQuestionKind,
  hasFeature: boolean
): string {
  if (!hasFeature) {
    return OFFERING_QUESTION_TITLES.company;
  }
  return OFFERING_QUESTION_TITLES[kind];
}
