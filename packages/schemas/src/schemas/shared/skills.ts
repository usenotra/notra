import "zod/compile";
import { z } from "zod";

import {
  SKILL_CONTENT_MAX_LENGTH,
  SKILL_DESCRIPTION_MAX_LENGTH,
  SKILL_NAME_MAX_LENGTH,
  SKILL_NAME_REGEX,
} from "../../constants/skills";

export const skillNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(
    SKILL_NAME_MAX_LENGTH,
    `Name must be ${SKILL_NAME_MAX_LENGTH} characters or fewer`
  )
  .regex(
    SKILL_NAME_REGEX,
    "Name must be lowercase, start and end with a letter or digit, and contain only letters, digits, and hyphens"
  );

export const skillDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(
    SKILL_DESCRIPTION_MAX_LENGTH,
    `Description must be ${SKILL_DESCRIPTION_MAX_LENGTH} characters or fewer`
  );

export const skillContentSchema = z
  .string()
  .min(1, "Content is required")
  .max(SKILL_CONTENT_MAX_LENGTH, "Content is too large");
