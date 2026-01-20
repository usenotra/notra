import fs from "node:fs";
import path from "node:path";
import { type Tool, tool } from "ai";
import matter from "gray-matter";
import * as z from "zod";
import { toolDescription } from "../utils/description";

interface SkillMetadata {
	name: string;
	version?: string;
	description?: string;
	"allowed-tools"?: string[];
	folder: string;
	filename: string;
}

interface Skill extends SkillMetadata {
	content: string;
}

function parseSkillFrontmatter(content: string): Partial<SkillMetadata> {
	const parsed = matter(content);
	return {
		name: parsed.data.name,
		version: parsed.data.version,
		description: parsed.data.description,
		"allowed-tools": parsed.data["allowed-tools"],
	};
}

function getSkillMetadata(
	skillFolder: string,
	skillsDir: string,
): SkillMetadata {
	const skillPath = path.join(skillsDir, skillFolder);
	const skillMdPath = path.join(skillPath, "SKILL.md");

	if (!fs.existsSync(skillMdPath)) {
		return { name: skillFolder, folder: skillFolder, filename: "SKILL.md" };
	}

	const content = fs.readFileSync(skillMdPath, "utf-8");
	const metadata = parseSkillFrontmatter(content);

	return {
		name: metadata.name || skillFolder,
		version: metadata.version,
		description: metadata.description,
		"allowed-tools": metadata["allowed-tools"],
		folder: skillFolder,
		filename: "SKILL.md",
	};
}

export function listAvailableSkills(): Tool {
	return tool({
		description: toolDescription({
			toolName: "list_available_skills",
			intro: "Lists all available skills for the user.",
			whenToUse:
				"When user asks about available skills, wants to see a list of skills, or needs to check if a skill is available.",
			usageNotes: `Requires the user to be logged in and have access to the skills.
Returns a list of available skills with their metadata (name, version, description, allowed-tools, folder).`,
		}),
		inputSchema: z.object({
			limit: z.number().default(10).describe("The number of skills to list"),
			offset: z
				.number()
				.default(0)
				.describe("The offset to start listing skills from"),
		}),
		execute: async ({ limit, offset }) => {
			const skillsDir = getSkillsDir();
			const skillFolders = fs
				.readdirSync(skillsDir, { withFileTypes: true })
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name);

			const skills = skillFolders
				.slice(offset, offset + limit)
				.map((folder) => getSkillMetadata(folder, skillsDir));

			return {
				skills,
				total: skillFolders.length,
			};
		},
	});
}

function getSkillsDir(): string {
	return path.join(process.cwd(), "apps", "dashboard", "src", "lib", "ai", "skills");
}

export function getSkillByName(): Tool {
	return tool({
		description: toolDescription({
			toolName: "get_skill_by_name",
			intro:
				"Gets a specific skill by its name or folder name. Use list_available_skills to see all available skills first.",
			whenToUse:
				"When user asks about a specific skill, wants to see skill details, or needs to use a particular skill. Use list_available_skills first to find the correct skill name.",
			usageNotes: `Requires the user to be logged in and have access to the skills.
Use list_available_skills to see all available skills and their names before calling this tool.
Returns the full skill metadata and content including name, version, description, allowed-tools, folder, filename, and the complete skill content.`,
		}),
		inputSchema: z.object({
			name: z
				.string()
				.describe(
					"The name of the skill to get. Can be the skill's name from frontmatter or the folder name.",
				),
		}),
		execute: async ({ name }) => {
			const skillsDir = getSkillsDir();
			const skillFolders = fs
				.readdirSync(skillsDir, { withFileTypes: true })
				.filter((dirent) => dirent.isDirectory())
				.map((dirent) => dirent.name);

			let skillFolder: string | undefined;

			for (const folder of skillFolders) {
				const skillPath = path.join(skillsDir, folder);
				const skillMdPath = path.join(skillPath, "SKILL.md");

				if (fs.existsSync(skillMdPath)) {
					const content = fs.readFileSync(skillMdPath, "utf-8");
					const parsed = matter(content);
					const skillName = parsed.data.name;

					if (
						folder.toLowerCase() === name.toLowerCase() ||
						skillName?.toLowerCase() === name.toLowerCase()
					) {
						skillFolder = folder;
						break;
					}
				} else if (folder.toLowerCase() === name.toLowerCase()) {
					skillFolder = folder;
					break;
				}
			}

			if (!skillFolder) {
				return {
					error: `Skill "${name}" not found. Use list_available_skills to see all available skills.`,
				};
			}

			const skillPath = path.join(skillsDir, skillFolder);
			const skillMdPath = path.join(skillPath, "SKILL.md");

			if (!fs.existsSync(skillMdPath)) {
				return {
					error: `Skill file not found for "${skillFolder}".`,
				};
			}

			const content = fs.readFileSync(skillMdPath, "utf-8");
			const parsed = matter(content);
			const metadata = parseSkillFrontmatter(content);

			return {
				name: metadata.name || skillFolder,
				version: metadata.version,
				description: metadata.description,
				"allowed-tools": metadata["allowed-tools"],
				folder: skillFolder,
				filename: "SKILL.md",
				content: parsed.content,
			} satisfies Skill;
		},
	});
}
