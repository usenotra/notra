import { convexClient } from "@convex-dev/better-auth/client/plugins";
import {
  inferOrgAdditionalFields,
  lastLoginMethodClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth } from "../../../convex/auth";

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    lastLoginMethodClient(),
    organizationClient({
      schema: inferOrgAdditionalFields<Auth>(),
    }),
  ],
});
