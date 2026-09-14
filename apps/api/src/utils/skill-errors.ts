import {
  SkillDuplicateError as ServiceSkillDuplicateError,
  SkillNotFoundError as ServiceSkillNotFoundError,
  SkillNotSystemError as ServiceSkillNotSystemError,
  SkillPersistenceError as ServiceSkillPersistenceError,
  SkillUpgradeInputError as ServiceSkillUpgradeInputError,
  SystemSkillVersionMissingError as ServiceSystemSkillVersionMissingError,
} from "@notra/ai/skills/errors";

import {
  SkillDatabaseError,
  SkillDuplicateError,
  SkillNotFoundError,
  SkillNotSystemError,
  SkillUpgradeInputError,
  SystemSkillVersionNotFoundError,
} from "../errors/skills";
import type { SkillDomainError } from "../types/skills";

/** Maps shared typed failures onto the public API's transport error model. */
export function mapSkillServiceError(
  cause: unknown
): SkillDomainError | SkillDatabaseError {
  if (cause instanceof ServiceSkillNotFoundError) {
    return new SkillNotFoundError();
  }
  if (cause instanceof ServiceSkillDuplicateError) {
    return new SkillDuplicateError({ name: cause.skillName });
  }
  if (cause instanceof ServiceSkillNotSystemError) {
    return new SkillNotSystemError({ name: cause.skillName });
  }
  if (cause instanceof ServiceSystemSkillVersionMissingError) {
    return new SystemSkillVersionNotFoundError();
  }
  if (cause instanceof ServiceSkillUpgradeInputError) {
    return new SkillUpgradeInputError({ reason: cause.reason });
  }
  if (cause instanceof ServiceSkillPersistenceError) {
    return new SkillDatabaseError({ cause: cause.cause });
  }

  return new SkillDatabaseError({ cause });
}
