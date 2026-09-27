import {
  SKILL_CONTENT_MAX_LENGTH,
  SKILL_DESCRIPTION_MAX_LENGTH,
  SKILL_NAME_MAX_LENGTH,
  SKILL_NAME_REGEX,
} from "@notra/ai/constants/skills";
import { z } from "zod";

import type { CommonTranslator } from "@/types/i18n";
import type { SkillFormTranslator } from "@/types/skills/form";

function skillFormFields(t: SkillFormTranslator, tCommon: CommonTranslator) {
  return {
    name: z
      .string()
      .trim()
      .min(1, tCommon("labels.nameIsRequired"))
      .max(SKILL_NAME_MAX_LENGTH, t("nameMax", { max: SKILL_NAME_MAX_LENGTH }))
      .regex(SKILL_NAME_REGEX, t("nameFormat")),
    description: z
      .string()
      .trim()
      .min(1, t("descriptionRequired"))
      .max(
        SKILL_DESCRIPTION_MAX_LENGTH,
        t("descriptionMax", { max: SKILL_DESCRIPTION_MAX_LENGTH })
      ),
    content: z
      .string()
      .min(1, t("contentRequired"))
      .max(SKILL_CONTENT_MAX_LENGTH, t("contentTooLarge")),
  };
}

export function createSkillFormSchema(
  t: SkillFormTranslator,
  tCommon: CommonTranslator
) {
  return z.object(skillFormFields(t, tCommon));
}

export function updateSkillFormSchema(
  t: SkillFormTranslator,
  tCommon: CommonTranslator
) {
  const fields = skillFormFields(t, tCommon);
  return z.object({
    name: fields.name.optional(),
    description: fields.description,
    content: fields.content,
  });
}
