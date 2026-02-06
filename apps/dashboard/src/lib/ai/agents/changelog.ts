import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { Output, generateText, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";
import {
	getValidToneProfile,
	toneConfigs,
} from "@/lib/ai/prompts/changelog/base";
import {
	createGetCommitsByTimeframeTool,
	createGetPullRequestsTool,
	createGetReleaseByTagTool,
} from "@/lib/ai/tools/github";
import { getSkillByName, listAvailableSkills } from "@/lib/ai/tools/skills";
import { openrouter } from "@/lib/openrouter";
import type { ToneProfile } from "@/utils/schemas/brand";

export const changelogOutputSchema = z.object({
	title: z
		.string()
		.max(120)
		.describe("The changelog title, no markdown"),
	markdown: z
		.string()
		.describe(
			"The full changelog content body as markdown/MDX, without the title heading (title is a separate field)",
		),
});

export type ChangelogOutput = z.infer<typeof changelogOutputSchema>;

export interface ChangelogAgentResult {
	output: ChangelogOutput;
}

export interface ChangelogAgentOptions {
	organizationId: string;
	tone?: ToneProfile;
	companyName?: string;
	companyDescription?: string;
	audience?: string;
	customInstructions?: string | null;
}

export async function generateChangelog(
	options: ChangelogAgentOptions,
	prompt: string,
): Promise<ChangelogAgentResult> {
	const {
		organizationId,
		tone = "Conversational",
		companyName,
		companyDescription,
		audience,
		customInstructions,
	} = options;

	const modelWithMemory = withSupermemory(
		openrouter("moonshotai/kimi-k2.5"),
		organizationId,
	);

	const validTone = getValidToneProfile(tone, "Conversational");
	const toneConfig = toneConfigs[validTone];

	const companyContext = companyName
		? `\nCompany: ${companyName}${companyDescription ? ` - ${companyDescription}` : ""}`
		: "";

	const audienceContext = audience ? `\nTarget Audience: ${audience}` : "";

	const customContext = customInstructions
		? `\n\nAdditional Instructions:\n${customInstructions}`
		: "";

	const instructions = `
# ROLE AND IDENTITY

${toneConfig.roleIdentity}

# AUDIENCE

${toneConfig.audienceGuidance}${companyContext}${audienceContext}

# TONE AND STYLE GUIDELINES

Summary Style: ${toneConfig.summaryStyle}

PR Description Style: ${toneConfig.prDescriptionStyle}

Language Guidelines:
${toneConfig.languageGuidelines.map((g) => `- ${g}`).join("\n")}

# TASK OBJECTIVE

You are a helpful devrel with a passion for turning technical information into easy to follow changelogs. Your job is to take information from GitHub repositories and turn that information into a changelog designed for humans to read.${companyContext}

# OUTPUT REQUIREMENTS

- Generate a comprehensive, well-organized changelog
- Process ALL pull requests from the provided data
- Categorize them logically into: Features, Bug Fixes, Performance, Documentation, Internal, Testing, Infrastructure, Security
- Present them in a developer-friendly format using MDX
- Title must be 120 characters or less
- Summary must be 600-800 words
- Do not use emojis in section headings
- Keep PR descriptions concise but informative
- Output ONLY the final markdown changelog, no reasoning or commentary

# AVAILABLE TOOLS

You have access to skills that can help improve your work. Use listAvailableSkills to see available skills, and getSkillByName to use a specific skill when needed. Always consider using the humanizer skill if the draft changelog reads overly robotic, stiff, or generic, and use it to humanize the final text while preserving technical accuracy and the selected tone.

  You also have access to GitHub tools:
- getPullRequests: Fetch detailed PR information
- getReleaseByTag: Get release details
- getCommitsByTimeframe: Retrieve commits from a timeframe
${customContext}
`;

	const agent = new ToolLoopAgent({
		model: modelWithMemory,
		tools: {
			getPullRequests: createGetPullRequestsTool(),
			getReleaseByTag: createGetReleaseByTagTool(),
			getCommitsByTimeframe: createGetCommitsByTimeframeTool(),
			listAvailableSkills: listAvailableSkills(),
			getSkillByName: getSkillByName(),
		},
		instructions,
		stopWhen: stepCountIs(31),
	});

	const agentResult = await agent.generate({ prompt });

	const { output } = await generateText({
		model: openrouter("google/gemini-2.0-flash-001"),
		output: Output.object({
			schema: changelogOutputSchema,
		}),
		prompt: `Extract the title and markdown body from the following changelog text. The title should be plain text (no markdown formatting, max 120 characters). The markdown should be the full changelog body without the title heading.\n\n${agentResult.text}`,
	});

	if (!output) {
		throw new Error("Failed to extract structured output from changelog");
	}

	return { output };
}
