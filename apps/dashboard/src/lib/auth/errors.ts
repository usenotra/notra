import { Data } from "effect";

import type { SecurityErrorCode } from "@/types/auth/security";

export class AuthSessionError extends Data.TaggedError("AuthSessionError")<{
  readonly message: string;
  readonly cause: unknown;
}> {}

export class UserSyncError extends Data.TaggedError("UserSyncError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class SocialConnectionError extends Data.TaggedError(
  "SocialConnectionError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}

export class WorkOSAuthError extends Data.TaggedError("WorkOSAuthError")<{
  readonly error: unknown;
}> {}

export class SecurityActionError extends Data.TaggedError(
  "SecurityActionError"
)<{
  readonly message: string;
  readonly code: SecurityErrorCode;
  readonly cause?: unknown;
}> {}
