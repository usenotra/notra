import dedent from "dedent";

import type { SkillContent, SkillSummary } from "../types";
import {
  escapeXmlAttribute,
  escapeXmlText,
  normalizeInlineText,
} from "./format";

export function filterPromptableSkills<T extends SkillSummary>(
  skills: T[]
): T[] {
  return skills.filter((skill) => skill.description.trim().length > 0);
}

export function normalizeSkillSummary<T extends SkillSummary>(skill: T): T {
  return {
    ...skill,
    name: skill.name.trim(),
    description: normalizeInlineText(skill.description),
  };
}

export function renderSkillGuidance(skills: SkillSummary[] = []) {
  const promptableSkills = filterPromptableSkills(
    skills.map(normalizeSkillSummary)
  );

  if (promptableSkills.length === 0) {
    return "";
  }

  return dedent`
    ## Skills
    Skills are task-specific instructions. You only see the skill catalog here, not the full skill bodies.
    Use getSkillByName to load the full skill body before applying a matching skill. Do not invent skill names.

    <available_skills>
    ${promptableSkills.map(formatSkillCatalogLine).join("\n")}
    </available_skills>
  `;
}

export function renderSkillToolOutput(skill: SkillContent) {
  return dedent`
    <skill_content name="${escapeXmlAttribute(skill.name)}">
    <description>${escapeXmlText(normalizeInlineText(skill.description))}</description>
    ${escapeXmlText(skill.content.trim())}
    </skill_content>
  `;
}

function formatSkillCatalogLine(skill: SkillSummary) {
  return `- ${escapeXmlText(skill.name)}: ${escapeXmlText(skill.description)}`;
}
