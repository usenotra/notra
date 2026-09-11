export function dashboardAgentOpenChatPath(
  organizationSlug: string,
  options: { chatId: string; hasConversation: boolean }
): string {
  if (options.hasConversation) {
    return `/${organizationSlug}/chat/${options.chatId}`;
  }

  return `/${organizationSlug}/chat`;
}
