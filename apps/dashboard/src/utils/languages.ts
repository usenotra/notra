import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@notra/ai/constants/languages";

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}
