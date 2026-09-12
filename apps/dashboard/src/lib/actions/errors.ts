import { Data } from "effect";

/**
 * Failure of a server action. `code` is optional and only set when the client
 * needs to branch on it (for example to open a step-up dialog).
 */
export class ActionFailure extends Data.TaggedError("ActionFailure")<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}
