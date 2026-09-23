import type { BrandSettings } from "@/types/hooks/brand-analysis";

export function indexBrandVoices(voices: BrandSettings[] = []) {
  const brandVoiceMap: Record<string, BrandSettings> = {};
  let defaultBrandVoice: BrandSettings | undefined;
  for (const voice of voices) {
    brandVoiceMap[voice.id] = voice;
    if (voice.isDefault) {
      defaultBrandVoice = voice;
    }
  }
  return { brandVoiceMap, defaultBrandVoice };
}
