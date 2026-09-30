import type { useTranslations } from "next-intl";

export type SkillFormTranslator = ReturnType<
  typeof useTranslations<"skills.validation">
>;
