import type {
  DiscardTotpEnrollmentInput,
  RegenerateBackupCodesInput,
  RemoveAuthFactorInput,
  VerifyTotpEnrollmentInput,
} from "@notra/schemas/types/dashboard/auth";
import { type } from "@orpc/server";

import {
  discardTotpEnrollment,
  getSecurityOverview,
  regenerateBackupCodes,
  removeAuthFactor,
  startTotpEnrollment,
  verifyTotpEnrollment,
} from "@/lib/auth/security-actions";
import {
  deleteUser,
  listAccounts,
  requestPasswordReset,
  unlinkAccount,
  updateUser,
} from "@/lib/auth/user-actions";
import { baseProcedure } from "@/lib/orpc/base";
import type {
  UnlinkAccountInput,
  UpdateUserInput,
} from "@/types/auth/user-actions";

// Each operation authenticates, validates its input and answers with an
// `ActionResult`, so the procedures only carry the call.
export const userAccountRouter = {
  update: baseProcedure
    .input(type<UpdateUserInput>())
    .handler(({ input }) => updateUser(input)),
  delete: baseProcedure.handler(() => deleteUser()),
  requestPasswordReset: baseProcedure.handler(() => requestPasswordReset()),
  listConnections: baseProcedure.handler(() => listAccounts()),
  unlinkConnection: baseProcedure
    .input(type<UnlinkAccountInput>())
    .handler(({ input }) => unlinkAccount(input)),
};

export const userSecurityRouter = {
  overview: baseProcedure.handler(() => getSecurityOverview()),
  startTotpEnrollment: baseProcedure.handler(() => startTotpEnrollment()),
  discardTotpEnrollment: baseProcedure
    .input(type<DiscardTotpEnrollmentInput>())
    .handler(({ input }) => discardTotpEnrollment(input)),
  verifyTotpEnrollment: baseProcedure
    .input(type<VerifyTotpEnrollmentInput>())
    .handler(({ input }) => verifyTotpEnrollment(input)),
  regenerateBackupCodes: baseProcedure
    .input(type<RegenerateBackupCodesInput>())
    .handler(({ input }) => regenerateBackupCodes(input)),
  removeAuthFactor: baseProcedure
    .input(type<RemoveAuthFactorInput>())
    .handler(({ input }) => removeAuthFactor(input)),
};
