import type { BaseTonePromptInput } from "@notra/ai/types/prompts";
import dedent from "dedent";

export function sanitizeToneNotes(value: string | null | undefined): string {
  return (
    value
      ?.trim()
      // Strip <tone-notes> wrappers (with attributes/whitespace variants) and
      // any nested <tone> tags so custom notes can never smuggle in a
      // competing <tone> value. Inner text is kept.
      .replace(/<\/?\s*tone-notes\b[^>]*>/gi, "")
      .replace(/<\/?\s*tone\b[^>]*>/gi, "") ?? ""
  );
}

export function getUserPrompt(
  contentLabel: string,
  params: BaseTonePromptInput
): string {
  const companyContext = params.companyName
    ? `\n<company>${params.companyName}${params.companyDescription ? ` - ${params.companyDescription}` : ""}</company>`
    : "";

  const audienceContext = params.audience
    ? `\n<target-audience>${params.audience}</target-audience>`
    : "";

  const languageContext = params.language
    ? `\n<language>${params.language}</language>`
    : "";

  const toneContext = params.tone ? `\n<tone>${params.tone}</tone>` : "";

  const sanitizedToneNotes = sanitizeToneNotes(params.customTone);
  const toneNotesContext =
    sanitizedToneNotes.length > 0
      ? `\n<tone-notes>${sanitizedToneNotes}</tone-notes>`
      : "";

  const customContext = params.customInstructions
    ? `\n<custom-instructions>\n${params.customInstructions}\n</custom-instructions>`
    : "";

  return dedent`
    Use this context when generating the ${contentLabel}:
    CRITICAL LANGUAGE RULE: IF <language> IS PRESENT, WRITE THE FINAL ${contentLabel.toUpperCase()} PRIMARILY IN THAT LANGUAGE. ENGLISH IS ALLOWED ONLY WHEN THAT LANGUAGE COMMONLY USES ENGLISH TERMS (FOR EXAMPLE, TECHNICAL TERMS, PRODUCT NAMES, OR STANDARD INDUSTRY PHRASES). DO NOT SWITCH FULL SENTENCES OR PARAGRAPHS TO ENGLISH UNLESS <language> IS ENGLISH, EVEN IF OTHER INSTRUCTIONS OR EXAMPLES ARE IN ENGLISH.
    CRITICAL TONE RULE: IF <tone> IS PRESENT, MATCH THE TONE SECTION WITH THAT NAME IN THE PRIMARY SKILL. TONE CHANGES WORDING, SENTENCE RHYTHM, AND EXAMPLES ONLY. IT NEVER CHANGES STRUCTURE, FACTS, AUDIENCE FILTERING, LANGUAGE, LENGTH LIMITS, OR FORMATTING RULES. IF <tone-notes> IS PRESENT, APPLY THOSE NOTES ON TOP OF THE NAMED TONE.
    CRITICAL BRAND/SOURCE RULE: <company> IS THE PUBLISHING IDENTITY. <sources> ARE JUST EVIDENCE INPUTS AND MAY NAME REPOSITORIES, INTEGRATIONS, WORKSPACES, TEAMS, OWNERS, OR ORGS THAT DO NOT MATCH <company>. NEVER REFUSE, HESITATE, OR CLAIM THE MATERIAL BELONGS TO A DIFFERENT PRODUCT JUST BECAUSE SOURCE NAMES DIFFER. IF A SOURCE LOOKS LIKE AN UPSTREAM OPEN SOURCE PROJECT, THIRD-PARTY REPOSITORY, OR SHARED CODEBASE, TREAT THE VERIFIED ACTIVITY AS <company>'S CONTRIBUTION, INTEGRATION WORK, OR COLLABORATION, NOT AS OWNERSHIP OF THE ENTIRE SOURCE. USE SOURCES FOR FACTS, AND USE <company> PLUS BRAND REFERENCES FOR VOICE AND IDENTITY. ONLY FAIL WHEN THERE IS NO MEANINGFUL VERIFIED WORK TO WRITE ABOUT, NOT BECAUSE OF A BRAND OR REPOSITORY NAME MISMATCH.

    <background-data>
    <sources>${params.sourceTargets}</sources>
    <today-utc>${params.todayUtc}</today-utc>
    <lookback-window label="${params.lookbackLabel}">
    ${params.lookbackStartIso} to ${params.lookbackEndIso} (UTC)
    </lookback-window>${companyContext}${audienceContext}${languageContext}${toneContext}${toneNotesContext}
    </background-data>${customContext}
  `;
}
