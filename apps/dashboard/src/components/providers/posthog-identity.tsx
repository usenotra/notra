"use client";

import { POSTHOG_GROUP_TYPES } from "@notra/posthog/constants/posthog";
import { useEffect } from "react";

import { POSTHOG_PROJECT_TOKEN } from "@/constants/posthog";
import { subscribeWhenPostHogReady } from "@/lib/analytics/posthog-lazy";
import { authClient } from "@/lib/auth/client";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";

export function PostHogIdentity() {
  const { data: session, isPending } = authClient.useSession();
  const [projectQuery] = useGeoProjectQueryState();
  const userId = session?.user.id;
  const organizationId = session?.session.activeOrganizationId ?? null;
  const projectId = projectQuery ?? null;
  const hidePersonalData = session?.user.hidePersonalData ?? true;
  const email = session?.user.email;
  const name = session?.user.name;

  useEffect(() => {
    if (!POSTHOG_PROJECT_TOKEN || isPending) {
      return;
    }

    return subscribeWhenPostHogReady((posthog) => {
      const identifiedUserId = posthog.get_property("$user_id");

      if (!userId) {
        if (identifiedUserId) {
          posthog.reset();
        }
        return;
      }

      if (identifiedUserId && identifiedUserId !== userId) {
        posthog.reset();
      }

      posthog.identify(
        userId,
        hidePersonalData ? undefined : { email, name: name ?? undefined }
      );
    });
  }, [email, hidePersonalData, isPending, name, userId]);

  useEffect(() => {
    if (!POSTHOG_PROJECT_TOKEN || isPending || !userId) {
      return;
    }

    return subscribeWhenPostHogReady((posthog) => {
      posthog.resetGroups();

      if (organizationId) {
        posthog.group(POSTHOG_GROUP_TYPES.ORGANIZATION, organizationId);
        posthog.register({ organization_id: organizationId });
      } else {
        posthog.unregister("organization_id");
      }

      if (projectId) {
        posthog.group(POSTHOG_GROUP_TYPES.PROJECT, projectId);
        posthog.register({ project_id: projectId });
      } else {
        posthog.unregister("project_id");
      }
    });
  }, [isPending, organizationId, projectId, userId]);

  return null;
}
