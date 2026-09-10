import { CHAT_WORKSPACE_LABEL_MAX_LENGTH } from "@notra/ai/constants/chat-workspace";
import type {
  ChatWorkspace,
  LoadChatWorkspaceParams,
} from "@notra/ai/types/chat-workspace";
import { db } from "@notra/db/drizzle";
import { organizations, projects } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";

const WHITESPACE_PATTERN = /\s+/g;

export function sanitizeChatWorkspaceLabel(value: string): string {
  let sanitized = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 31 || code === 127) {
      continue;
    }
    sanitized += character;
  }

  return sanitized
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .slice(0, CHAT_WORKSPACE_LABEL_MAX_LENGTH);
}

export async function loadChatWorkspace({
  organizationId,
  projectId,
}: LoadChatWorkspaceParams): Promise<ChatWorkspace | null> {
  const trimmedProjectId = projectId?.trim() || null;

  const [organization, project] = await Promise.all([
    db.query.organizations.findFirst({
      columns: { id: true, name: true, slug: true },
      where: eq(organizations.id, organizationId),
    }),
    trimmedProjectId
      ? db.query.projects.findFirst({
          columns: { id: true, name: true },
          where: and(
            eq(projects.id, trimmedProjectId),
            eq(projects.organizationId, organizationId)
          ),
        })
      : Promise.resolve(null),
  ]);

  if (!organization) {
    return null;
  }

  return {
    organization,
    project: project ?? null,
  };
}
