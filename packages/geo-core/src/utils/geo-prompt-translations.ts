import { GEO_LANGUAGE_MAX_PROMPTS, GEO_MAX_LANGUAGES } from "../constants/geo";
import type {
  GeoPromptDefinition,
  GeoPromptTranslationEntry,
  GeoPromptTranslationLanguagePlan,
  GeoPromptTranslationRecord,
} from "../types/geo";

function toEntry(
  prompt: GeoPromptDefinition,
  record: GeoPromptTranslationRecord | undefined
): GeoPromptTranslationEntry {
  const text = record?.text ?? null;
  const stale =
    record !== undefined &&
    !record.edited &&
    record.sourceText !== null &&
    record.sourceText !== prompt.text;
  return {
    promptId: prompt.id,
    sourceText: prompt.text,
    text,
    edited: record?.edited ?? false,
    needsTranslation: text === null || stale,
  };
}

/**
 * Which prompts each translated language scans, and which of them still need
 * a translation. A stored row picks a prompt for a language. A language
 * without any picked active prompt falls back to the first prompts, so a newly
 * tracked language (or one whose picks were all deleted) is never empty.
 */
export function planGeoPromptTranslations(input: {
  prompts: readonly GeoPromptDefinition[];
  languages: readonly string[];
  promptLanguage: string;
  records: readonly GeoPromptTranslationRecord[];
  limit?: number;
}): GeoPromptTranslationLanguagePlan[] {
  const limit = input.limit ?? GEO_LANGUAGE_MAX_PROMPTS;
  const translated = input.languages
    .filter((language) => language !== input.promptLanguage)
    .slice(0, GEO_MAX_LANGUAGES);

  return translated.map((language) => {
    const byPrompt = new Map(
      input.records
        .filter((record) => record.language === language)
        .map((record) => [record.promptId, record])
    );
    const picked = input.prompts
      .filter((prompt) => byPrompt.has(prompt.id))
      .slice(0, limit);
    const defaulted = picked.length === 0;
    const scanned = defaulted ? input.prompts.slice(0, limit) : picked;
    return {
      language,
      defaulted,
      entries: scanned.map((prompt) =>
        toEntry(prompt, byPrompt.get(prompt.id))
      ),
    };
  });
}
