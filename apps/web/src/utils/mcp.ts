export function formatMcpHeroSubhead(toolCount: number): string {
  return `${toolCount} tools over MCP. Your agent drafts changelogs, launch posts, and social updates from the editor it already lives in.`;
}

export function formatMcpMoreToolsLabel(hiddenCount: number): string {
  return `+ ${hiddenCount} more tools`;
}

export function formatMcpWhatsNewDiscovery(toolCount: number): string {
  return `notra MCP · ${toolCount} tools discovered automatically`;
}

export function formatMcpUseCasesCalloutLabel(useCaseCount: number): string {
  return `${useCaseCount} copy-paste workflows for visibility tracking, content and reporting, each with the exact prompt and the tools it calls.`;
}
