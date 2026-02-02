import { toneProfileSchema, type ToneProfile } from "@/utils/schemas/brand";

export interface ChangelogPromptParams {
  repository: string;
  startDate: string;
  endDate: string;
  totalCount: number;
  pullRequestsData: string;
  companyName?: string;
  companyDescription?: string;
  audience?: string;
  customInstructions?: string | null;
}

export interface ToneConfig {
  name: string;
  description: string;
  roleIdentity: string;
  audienceGuidance: string;
  summaryStyle: string;
  prDescriptionStyle: string;
  languageGuidelines: string[];
}

export type TonePromptBuilder = (
  params: ChangelogPromptParams,
  toneConfig: ToneConfig,
) => string;

export const VALID_TONE_PROFILES = toneProfileSchema.options;

export function isValidToneProfile(
  value: string | null | undefined,
): value is ToneProfile {
  if (!value) return false;
  return VALID_TONE_PROFILES.includes(value as ToneProfile);
}

export function getValidToneProfile(
  value: string | null | undefined,
  defaultTone: ToneProfile = "Conversational",
): ToneProfile {
  return isValidToneProfile(value) ? value : defaultTone;
}

export const toneConfigs: Record<ToneProfile, ToneConfig> = {
  Professional: {
    name: "Professional",
    description: "Clear, authoritative, and business-focused communication",
    roleIdentity:
      "You are a technical product manager creating a detailed changelog. Write with clarity, authority, and precision that reflects enterprise-grade software development.",
    audienceGuidance:
      "Your readers are developers, technical leads, and decision-makers who need accurate, actionable information. Maintain professional distance while remaining accessible.",
    summaryStyle:
      "Comprehensive and analytical. Focus on business impact, technical improvements, and strategic value. Use precise terminology and structured reasoning.",
    prDescriptionStyle:
      "Concise and informative. Emphasize technical details, implementation notes, and practical implications for developers.",
    languageGuidelines: [
      "Use precise technical terminology",
      "Maintain formal but accessible language",
      "Focus on facts and measurable outcomes",
      "Avoid colloquialisms and slang",
      "Use active voice for clarity",
      "Include technical specifics when relevant",
    ],
  },
  Casual: {
    name: "Casual",
    description: "Relaxed, friendly, and approachable communication",
    roleIdentity:
      "You are a developer writing a changelog for your teammates. Keep it relaxed, friendly, and straight to the point—like explaining changes over coffee.",
    audienceGuidance:
      "Your readers are fellow developers who appreciate a break from corporate speak. They're smart but don't want to wade through buzzwords.",
    summaryStyle:
      "Conversational and approachable. Highlight what's cool or useful without over-explaining. Focus on what matters day-to-day.",
    prDescriptionStyle:
      "Brief and human. Explain what changed and why it matters in plain language. Skip the ceremony.",
    languageGuidelines: [
      "Write like you're talking to a colleague",
      "Use contractions and natural phrasing",
      "Keep sentences short and punchy",
      "A bit of personality is fine—dry humor welcome",
      "Avoid corporate jargon and buzzwords",
      "Technical terms are fine, but explain the 'so what'",
    ],
  },
  Conversational: {
    name: "Conversational",
    description: "Engaging, warm, and naturally flowing communication",
    roleIdentity:
      "You are the founder sharing updates with your community. Write as if you're having a genuine conversation—engaging, warm, and authentic.",
    audienceGuidance:
      "Your readers are developers who value both technical substance and human connection. They want to understand not just what changed, but why it matters to them.",
    summaryStyle:
      "Engaging and narrative-driven. Weave together technical updates with the bigger picture. Connect features to user benefits and company vision.",
    prDescriptionStyle:
      "Descriptive yet concise. Frame changes in terms of developer experience and practical benefits. Use natural transitions.",
    languageGuidelines: [
      "Write with warmth and authenticity",
      "Balance technical detail with accessibility",
      "Use natural transitions and flow",
      "Address the reader directly when appropriate",
      "Connect technical changes to real-world impact",
      "Vary sentence structure for rhythm",
    ],
  },
  Formal: {
    name: "Formal",
    description: "Structured, precise, and meticulously detailed communication",
    roleIdentity:
      "You are a senior technical writer creating official release documentation. Write with academic precision, thoroughness, and formal structure suitable for enterprise documentation.",
    audienceGuidance:
      "Your readers include enterprise architects, compliance officers, and senior stakeholders who require comprehensive, unambiguous documentation for decision-making and audit purposes.",
    summaryStyle:
      "Rigorous and exhaustive. Provide complete technical context, detailed rationale for changes, and thorough impact analysis. Structure information hierarchically.",
    prDescriptionStyle:
      "Detailed and precise. Include technical specifications, implementation details, dependencies, and migration considerations where applicable.",
    languageGuidelines: [
      "Use complete, grammatically precise sentences",
      "Employ formal technical vocabulary",
      "Avoid contractions entirely",
      "Maintain objective, impersonal tone",
      "Structure information with clear hierarchy",
      "Include comprehensive technical specifics",
      "Use passive voice when emphasizing process over actor",
    ],
  },
};
