import type { useTranslations } from "next-intl";

export type CreateOrgFormTranslator = ReturnType<
  typeof useTranslations<"nav.createOrg.validation">
>;
