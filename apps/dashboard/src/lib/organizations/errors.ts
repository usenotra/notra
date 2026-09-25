import { Data } from "effect";

export class WorkOSSyncError extends Data.TaggedError("WorkOSSyncError")<{
  readonly message: string;
  readonly cause: unknown;
}> {}
