import type { GeoSampleProfile } from "@notra/geo-core/types/geo-sample";

import { DEMO_COMPANY_NAME } from "@/constants/demo";

/**
 * Swaps the sample company's name for the visitor's. Only the capitalized
 * brand word is replaced; `.example` domains and slugs stay as they are.
 */
export function personalizeDemoText(text: string, companyName: string): string {
  return companyName === DEMO_COMPANY_NAME
    ? text
    : text.replaceAll(DEMO_COMPANY_NAME, companyName);
}

export function personalizeGeoProfile(
  profile: GeoSampleProfile,
  companyName: string
): GeoSampleProfile {
  const text = (value: string) => personalizeDemoText(value, companyName);
  return {
    ...profile,
    prompts: profile.prompts.map((prompt) => ({
      english: text(prompt.english),
      german: text(prompt.german),
    })),
    sequences: profile.sequences.map((sequence) => ({
      name: text(sequence.name),
      steps: sequence.steps.map(text),
    })),
    sources: profile.sources.map((source) => ({
      ...source,
      title: text(source.title),
    })),
    codingAgentSources: profile.codingAgentSources.map((source) => ({
      ...source,
      title: text(source.title),
    })),
  };
}
