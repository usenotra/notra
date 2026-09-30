import { Data } from "effect";

export class ActionFailure extends Data.TaggedError("ActionFailure")<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}
