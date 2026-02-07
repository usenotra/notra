interface GithubWebhookMemoryPromptParams {
  eventType: "release" | "push" | "star";
  repository: string;
  action: string;
  data: Record<string, unknown>;
}

export function getGithubWebhookMemoryPrompt(
  params: GithubWebhookMemoryPromptParams
) {
  const { eventType, repository, action, data } = params;

  return {
    system:
      "You are a concise technical archivist. Convert webhook events into short, factual memory entries. Do not add commentary or speculation.",
    user: `Create a single short memory entry (1-3 sentences) for this GitHub webhook event. Focus on facts that would be useful later for changelogs, release summaries, or milestone tracking. Avoid bullet points and avoid markdown.

Repository: ${repository}
Event type: ${eventType}
Action: ${action}
Event data (JSON): ${JSON.stringify(data, null, 2)}
`,
  };
}
