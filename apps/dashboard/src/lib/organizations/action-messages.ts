import { Effect } from "effect";
import { getTranslations } from "next-intl/server";

import type { OrganizationActionMessageKey } from "@/types/organizations/action-messages";

export const organizationActionMessage = (key: OrganizationActionMessageKey) =>
  Effect.promise(() => getTranslations("errors")).pipe(
    Effect.map((t) => t(key))
  );

export const noActiveOrganizationMessage = Effect.promise(() =>
  getTranslations("common.labels")
).pipe(Effect.map((t) => t("noActiveOrganization")));
