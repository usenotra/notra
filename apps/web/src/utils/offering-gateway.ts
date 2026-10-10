import { OFFERING_CHECK_GATEWAY_TAG } from "@/constants/offering-check";

/**
 * Tags every gateway call so the free tool's spend shows up on its own in
 * AI Gateway, split by step. Visitors type these prompts, so they are never
 * used for training.
 */
export function offeringGatewayOptions(step: string) {
  return {
    tags: [OFFERING_CHECK_GATEWAY_TAG, `${OFFERING_CHECK_GATEWAY_TAG}-${step}`],
    disallowPromptTraining: true,
  };
}
