import type { AuthenticationResponse } from "@workos-inc/node";
import { getWorkOS } from "@workos/authkit-session";
import { Effect } from "effect";

import { WorkOSAuthError } from "@/lib/auth/errors";
import { readWorkOSError } from "@/lib/auth/workos-error";

const ORG_SELECTION_REQUIRED_CODE = "organization_selection_required";

const tryAuth = (run: () => Promise<AuthenticationResponse>) =>
  Effect.tryPromise({
    try: run,
    catch: (error) => new WorkOSAuthError({ error }),
  });

export const authenticateResolvingOrgSelection = (
  run: () => Promise<AuthenticationResponse>
): Effect.Effect<AuthenticationResponse, WorkOSAuthError> =>
  tryAuth(run).pipe(
    Effect.catch((error) => {
      const info = readWorkOSError(error.error);
      const organizationId = info.organizationIds[0];

      if (
        info.code !== ORG_SELECTION_REQUIRED_CODE ||
        !info.pendingAuthenticationToken ||
        !organizationId
      ) {
        return Effect.fail(error);
      }

      return tryAuth(() =>
        getWorkOS().userManagement.authenticateWithOrganizationSelection({
          clientId: process.env.WORKOS_CLIENT_ID ?? "",
          pendingAuthenticationToken: info.pendingAuthenticationToken ?? "",
          organizationId,
        })
      );
    })
  );
