import type { GeoSampleProfile } from "@notra/geo-core/types/geo-sample";

import {
  DEMO_COMPANY_DOMAIN,
  DEMO_COMPANY_HANDLE,
  DEMO_COMPANY_NAME,
} from "@/constants/demo";

const NON_HANDLE_CHARACTERS = /[^a-z0-9]+/g;

/** Lowercase handle for the visitor's company, e.g. for social accounts. */
export function demoCompanyHandle(companyName: string): string {
  return (
    companyName.toLowerCase().replaceAll(NON_HANDLE_CHARACTERS, "") ||
    DEMO_COMPANY_HANDLE
  );
}

/** The visitor's company on a reserved `.example` domain. */
export function demoCompanyDomain(companyName: string): string {
  return `${demoCompanyHandle(companyName)}.example`;
}

/**
 * Swaps the sample company's name and domain for the visitor's. Only the
 * capitalized brand word and the `.example` domain are replaced; slugs stay.
 */
export function personalizeDemoText(text: string, companyName: string): string {
  if (companyName === DEMO_COMPANY_NAME) {
    return text;
  }
  // English possessive: "Labs'" rather than "Labs's".
  const possessive = companyName.endsWith("s")
    ? `${companyName}'`
    : `${companyName}'s`;
  // Replacer functions: a string replacement would expand `$&` and friends
  // in the visitor's company name.
  return text
    .replaceAll(`${DEMO_COMPANY_NAME}'s`, () => possessive)
    .replaceAll(DEMO_COMPANY_NAME, () => companyName)
    .replaceAll(DEMO_COMPANY_DOMAIN, demoCompanyDomain(companyName))
    .replaceAll(
      `${DEMO_COMPANY_HANDLE}-`,
      `${demoCompanyHandle(companyName)}-`
    );
}

export function personalizeGeoProfile(
  profile: GeoSampleProfile,
  companyName: string
): GeoSampleProfile {
  const text = (value: string) => personalizeDemoText(value, companyName);
  const source = (item: GeoSampleProfile["sources"][number]) => ({
    ...item,
    title: text(item.title),
    url: text(item.url),
    domain: text(item.domain),
  });
  return {
    ...profile,
    projectName: text(profile.projectName),
    prompts: profile.prompts.map((prompt) => ({
      english: text(prompt.english),
      german: text(prompt.german),
    })),
    sequences: profile.sequences.map((sequence) => ({
      name: text(sequence.name),
      steps: sequence.steps.map(text),
    })),
    sources: profile.sources.map(source),
    codingAgentSources: profile.codingAgentSources.map(source),
    trafficHosts: profile.trafficHosts.map(text),
  };
}
