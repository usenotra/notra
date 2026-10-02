import { EVALUATION_BOOLEAN_THRESHOLD } from "@notra/ai/constants/evaluation";
import { getEvaluationClient } from "@notra/ai/evaluation/client";

import { CONTACT_SPAM_QUESTION } from "@/constants/contact-spam";
import type { ContactMessageInput } from "@/types/contact";

export async function isContactSpam(
  input: ContactMessageInput
): Promise<boolean> {
  const evaluation = await getEvaluationClient().tryEvaluate({
    feature: "contact-spam",
    state: { message: input.message },
    questions: CONTACT_SPAM_QUESTION,
  });

  // A failed or unavailable classifier must not silently discard a real inquiry.
  return (
    (evaluation?.answers.spam.probability ?? 0) >= EVALUATION_BOOLEAN_THRESHOLD
  );
}
