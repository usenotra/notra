import { Effect } from "effect";

import type { PostPublishedInput } from "../types/posts";
import { postPublishedInput } from "../utils/posts";
import { publishEvent } from "./events";

export const publishPostPublished = Effect.fn("webhooks.publishPostPublished")(
  function* (input: PostPublishedInput) {
    return yield* publishEvent(postPublishedInput(input));
  }
);
