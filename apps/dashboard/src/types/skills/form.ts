import type { useTranslations } from "use-intl";

export type SkillFormTranslator = ReturnType<
  typeof useTranslations<"skills.validation">
>;
