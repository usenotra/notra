import { isDemoMode } from "@notra/utils/demo-mode";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { invitationActionSchema } from "@/schemas/invitation";
import type { UiRouteInput } from "@/types/ui-route";

export const loadInvitation = createServerFn({ method: "GET" })
  .validator((data: UiRouteInput) => data)
  .handler(async ({ data: { searchParams } }) => {
    if (isDemoMode()) {
      throw notFound();
    }
    const { loadInvitationPage } =
      await import("@/lib/invitations/invitations");
    const token = searchParams.invitation_token;
    return loadInvitationPage(typeof token === "string" ? token : undefined);
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .validator((data: unknown) => invitationActionSchema.parse(data))
  .handler(async ({ data }) => {
    if (isDemoMode()) {
      throw notFound();
    }
    const { acceptInvitationByToken } =
      await import("@/lib/invitations/invitations");
    return acceptInvitationByToken(data.token);
  });

export const declineInvitation = createServerFn({ method: "POST" })
  .validator((data: unknown) => invitationActionSchema.parse(data))
  .handler(async ({ data }) => {
    if (isDemoMode()) {
      throw notFound();
    }
    const { declineInvitationByToken } =
      await import("@/lib/invitations/invitations");
    return declineInvitationByToken(data.token);
  });
