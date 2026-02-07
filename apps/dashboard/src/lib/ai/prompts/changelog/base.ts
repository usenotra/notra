import dedent from "dedent";
import { type ToneProfile, toneProfileSchema } from "@/utils/schemas/brand";

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

const VALID_TONE_PROFILES = toneProfileSchema.options;

export function getValidToneProfile(
  value: string | null | undefined,
  defaultTone: ToneProfile = "Conversational"
): ToneProfile {
  if (value && VALID_TONE_PROFILES.includes(value as ToneProfile)) {
    return value as ToneProfile;
  }
  return defaultTone;
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

export function buildChangelogPrompt(
  params: ChangelogPromptParams,
  toneConfig: ToneConfig
): string {
  const {
    repository,
    startDate,
    endDate,
    totalCount,
    pullRequestsData,
    companyName,
    companyDescription,
    audience,
    customInstructions,
  } = params;

  const companyContext = companyName
    ? `\nCompany: ${companyName}${companyDescription ? ` - ${companyDescription}` : ""}`
    : "";

  const audienceContext = audience ? `\nTarget Audience: ${audience}` : "";

  const customContext = customInstructions
    ? `\n\n# CUSTOM INSTRUCTIONS\n\n${customInstructions}`
    : "";

  return dedent`
    # ROLE AND IDENTITY

    ${toneConfig.roleIdentity}

    # AUDIENCE

    ${toneConfig.audienceGuidance}${companyContext}${audienceContext}

    # TONE AND STYLE GUIDELINES

    ${toneConfig.summaryStyle}

    ${toneConfig.prDescriptionStyle}

    Language guidelines:
    ${toneConfig.languageGuidelines.map((g: string) => `- ${g}`).join("\n    ")}

    # TASK OBJECTIVE

    Generate a comprehensive, well-organized changelog that processes EVERY pull request from the provided data, categorizes them logically, and presents them in a developer-friendly format.${companyContext}

    Repository: ${repository}
    Date Range: ${startDate} to ${endDate}
    Total PRs: ${totalCount}

    Pull Requests Data:
    ${pullRequestsData}

    # AVAILABLE TOOLS

    You have access to the following tools to gather additional information:

    - **getPullRequestsTool**: Fetch detailed information about a specific pull request
      - Use when: You need more context about a PR (detailed description, files changed, review comments)
      - Parameters: owner, repo, pull_number

    - **getReleaseByTagTool**: Get release details by tag
      - Use when: You need to reference previous releases or understand version context
      - Parameters: owner, repo, tag (defaults to "latest")

    - **getCommitsByTimeframeTool**: Retrieve commits from a specific timeframe
      - Use when: You need to verify commit history or fill gaps in PR data
      - Parameters: owner, repo, days (defaults to 7)

    ## When to Use Tools

    - If a PR description is unclear or missing, use "getPullRequestsTool" to get full details
    - If you need to compare against previous releases, use "getReleaseByTagTool"
    - If commit context would help explain changes, use "getCommitsByTimeframeTool"
    - Only use tools when the provided data is insufficient for creating a quality changelog

    # CRITICAL REQUIREMENTS

    - Process ALL ${totalCount} pull requests from the JSON data
    - Each PR must appear exactly once in the appropriate category
    - Do not skip, omit, or summarize any PRs
    - If the data is truncated, explicitly note which PRs were included

    # PROCESSING STEPS

    Follow these steps in order:

    1. Parse the JSON data and extract all ${totalCount} pull request entries
    2. Identify any PRs that need additional context and use tools if necessary
    3. Categorize each PR by analyzing its title, description, and labels
    4. Write the summary covering major themes (600-800 words)
    5. Organize PRs into categories with consistent formatting
    6. Verify all ${totalCount} PRs are included exactly once

    # OUTPUT FORMAT REQUIREMENTS

    # [Engaging Title - max 120 characters]

    ## Summary

    Write a 600-800 word engaging summary covering the major themes and impacts of this release.

    Focus on:
    - Major feature additions and their business impact
    - Significant bug fixes or performance improvements
    - Breaking changes or migration requirements
    - Overall direction and highlights

    ## Pull Requests by Category

    Organize EVERY PR from the data into appropriate sections:

    ### Features & Enhancements
    [List all feature/enhancement PRs here]

    ### Bug Fixes
    [List all bug fix PRs here]

    ### Performance Improvements
    [List all performance PRs here]

    ### Documentation
    [List all documentation PRs here]

    ### Internal Changes
    [List all internal/refactor PRs here]

    ### Testing
    [List all testing PRs here]

    ### Infrastructure
    [List all infrastructure PRs here]

    ### Security
    [List all security PRs here]

    # PR ENTRY FORMAT

    For each PR use this exact format:
    - **[Descriptive Title]** [#\${number}](https://github.com/${repository}/pull/\${number}) - Brief description of the change and its impact. (Author: @\${author})

    # CATEGORIZATION GUIDELINES

    - Features: New functionality or significant enhancements
    - Bug Fixes: Corrections to existing functionality
    - Performance: Speed, memory, or efficiency improvements
    - Documentation: Readme, guides, comments, or API docs
    - Internal: Refactoring, code organization, dependencies
    - Testing: New tests, test improvements, CI/CD
    - Infrastructure: Build systems, deployment, dev environment
    - Security: Vulnerabilities, auth, permissions, data protection

    If a PR fits multiple categories, prioritize in this order: Security > Bug Fixes > Features > Performance > Infrastructure > Internal > Testing > Documentation

    # VERIFICATION REQUIREMENTS (INTERNAL ONLY - DO NOT OUTPUT)

    Before providing your final response, verify:

    1. Create a mental list of all ${totalCount} PR numbers from the JSON data
    2. Ensure each PR appears exactly once in the appropriate category
    3. Verify no PR from the source data has been skipped
    4. If truncated, note: "Note: Only the first X PRs were provided in the source data due to volume limitations."

    # CONSTRAINTS

    - Title must be 120 characters or less
    - Summary must be 600-800 words
    - Use MDX format only
    - Do not include verification steps in output
    - Do not use emojis in section headings
    - Keep PR descriptions concise but informative
    - Only use tools when necessary to improve changelog quality
    - Adhere strictly to the tone and style guidelines above
    ${customContext}

    Output ONLY the MDX content for the changelog.
  `;
}
