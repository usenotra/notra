import { Schema } from "effect";

export class BrandIdentityNotFoundError extends Schema.TaggedError<BrandIdentityNotFoundError>()(
  "BrandIdentityNotFoundError",
  {}
) {}

export class BrandIdentityNameDuplicateError extends Schema.TaggedError<BrandIdentityNameDuplicateError>()(
  "BrandIdentityNameDuplicateError",
  {}
) {}

export class BrandIdentityCreateFailedError extends Schema.TaggedError<BrandIdentityCreateFailedError>()(
  "BrandIdentityCreateFailedError",
  {}
) {}

export class BrandIdentityDefaultDeleteError extends Schema.TaggedError<BrandIdentityDefaultDeleteError>()(
  "BrandIdentityDefaultDeleteError",
  {}
) {}

export class BrandIdentityInUseError extends Schema.TaggedError<BrandIdentityInUseError>()(
  "BrandIdentityInUseError",
  {}
) {}

export class BrandAnalysisJobNotFoundError extends Schema.TaggedError<BrandAnalysisJobNotFoundError>()(
  "BrandAnalysisJobNotFoundError",
  {}
) {}

export class BrandAnalysisQueueFailedError extends Schema.TaggedError<BrandAnalysisQueueFailedError>()(
  "BrandAnalysisQueueFailedError",
  {}
) {}

export class BrandIdentityDatabaseError extends Schema.TaggedError<BrandIdentityDatabaseError>()(
  "BrandIdentityDatabaseError",
  { cause: Schema.Defect() }
) {}
