import type { useTranslations } from "use-intl";

export type CreateOrgFormTranslator = ReturnType<
  typeof useTranslations<"nav.createOrg.validation">
>;
