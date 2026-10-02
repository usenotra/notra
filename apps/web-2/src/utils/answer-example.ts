import {
  ANSWER_EXAMPLE_POSITION_MID,
  ANSWER_EXAMPLE_POSITION_TOP,
} from "@/constants/landing/answer-example";
import type { AnswerPositionTone } from "@/types/landing/geo";

export function answerPositionTone(position: number): AnswerPositionTone {
  if (position <= ANSWER_EXAMPLE_POSITION_TOP) {
    return "top";
  }
  if (position <= ANSWER_EXAMPLE_POSITION_MID) {
    return "mid";
  }
  return "low";
}
