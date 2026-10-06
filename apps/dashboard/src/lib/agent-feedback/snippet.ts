import { NOTRA_AGENT_FEEDBACK_PROMPT } from "@notra/utils/constants/agent-feedback-prompt";

import {
  AGENT_FEEDBACK_API_BASE_URL,
  AGENT_FEEDBACK_API_PATH,
  AGENT_FEEDBACK_API_URL_ENV,
  AGENT_FEEDBACK_DOCS_URL,
  AGENT_FEEDBACK_PACKAGE,
  AGENT_FEEDBACK_PACKAGE_ENTRY,
} from "@/constants/agent-feedback";
import type {
  AgentFeedbackSetupResponse,
  AgentFeedbackSetupSnippets,
  AgentFeedbackSetupSource,
} from "@/types/agent-feedback";

const TRAILING_SLASHES_REGEX = /\/+$/;

function resolveApiBaseUrl(): string {
  const override = process.env[AGENT_FEEDBACK_API_URL_ENV]?.trim();
  const base =
    override && override.length > 0 ? override : AGENT_FEEDBACK_API_BASE_URL;
  return base.replace(TRAILING_SLASHES_REGEX, "");
}

function buildAgentFeedbackUrl(organizationSlug: string): string {
  return `${resolveApiBaseUrl()}${AGENT_FEEDBACK_API_PATH}/${organizationSlug}`;
}

function buildPromptSnippet(
  source: AgentFeedbackSetupSource,
  feedbackUrl: string
): string {
  return [
    `Add a feedback tool to our MCP server so AI agents using ${source.organizationName} can send bugs, feature requests, questions and praise to our Notra inbox.`,
    "",
    `1. Install ${AGENT_FEEDBACK_PACKAGE} with the project's package manager.`,
    `2. Where the McpServer is created, call registerFeedbackTool(server, { url: ${JSON.stringify(feedbackUrl)}, productName: ${JSON.stringify(source.organizationName)} }) from "${AGENT_FEEDBACK_PACKAGE_ENTRY}". It registers a submit_feedback tool that accepts message, title, kind (bug | feature | praise | question | other), sentiment (negative | neutral | positive) and contextUrl. The URL is not a secret, so it can live in code.`,
    `3. If the server does not use @modelcontextprotocol/sdk, register an equivalent tool that POSTs JSON to ${feedbackUrl} with a body of { message, title?, kind?, sentiment?, contextUrl?, agentClient? }. No authentication header is needed. Only message is required; Notra fills in title, kind and sentiment when they are missing. The API answers 202 with the stored feedback.`,
    "4. Mention the tool in the server instructions so agents know they can use it when a user hits a problem or asks for something we do not support.",
    "",
    `Docs: ${AGENT_FEEDBACK_DOCS_URL}`,
    "",
    NOTRA_AGENT_FEEDBACK_PROMPT,
  ].join("\n");
}

function buildMcpSnippet(productName: string, feedbackUrl: string): string {
  return [
    'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
    `import { registerFeedbackTool } from "${AGENT_FEEDBACK_PACKAGE_ENTRY}";`,
    "",
    "const server = new McpServer({",
    `  name: ${JSON.stringify(productName)},`,
    '  version: "1.0.0",',
    "});",
    "",
    "registerFeedbackTool(server, {",
    `  url: ${JSON.stringify(feedbackUrl)},`,
    `  productName: ${JSON.stringify(productName)},`,
    "});",
  ].join("\n");
}

function buildFetchSnippet(productName: string, feedbackUrl: string): string {
  return [
    'import * as z from "zod";',
    "",
    "server.registerTool(",
    '  "submit_feedback",',
    "  {",
    `    description: ${JSON.stringify(`Send feedback about ${productName} to the team: bugs, feature requests, questions or praise.`)},`,
    "    inputSchema: {",
    "      message: z.string().min(1).max(4000),",
    '      kind: z.enum(["bug", "feature", "praise", "question", "other"]).optional(),',
    '      sentiment: z.enum(["negative", "neutral", "positive"]).optional(),',
    "      contextUrl: z.string().url().optional(),",
    "    },",
    "  },",
    "  async (input) => {",
    `    const response = await fetch(${JSON.stringify(feedbackUrl)}, {`,
    '      method: "POST",',
    '      headers: { "content-type": "application/json" },',
    "      body: JSON.stringify(input),",
    "    });",
    "    return {",
    "      content: [",
    "        {",
    '          type: "text",',
    "          text: response.ok",
    '            ? "Thanks, the feedback was sent to the team."',
    '            : "Feedback could not be submitted.",',
    "        },",
    "      ],",
    "      isError: !response.ok,",
    "    };",
    "  }",
    ");",
  ].join("\n");
}

function buildCurlSnippet(feedbackUrl: string): string {
  return [
    `curl -X POST ${feedbackUrl} \\`,
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "message": "The search tool times out when the query has quotes.",',
    '    "contextUrl": "https://docs.example.com/search"',
    "  }'",
  ].join("\n");
}

function buildAgentFeedbackSnippets(
  source: AgentFeedbackSetupSource,
  feedbackUrl: string
): AgentFeedbackSetupSnippets {
  return {
    mcp: buildMcpSnippet(source.organizationName, feedbackUrl),
    fetch: buildFetchSnippet(source.organizationName, feedbackUrl),
    curl: buildCurlSnippet(feedbackUrl),
  };
}

export function buildAgentFeedbackSetup(
  source: AgentFeedbackSetupSource
): AgentFeedbackSetupResponse {
  const feedbackUrl = buildAgentFeedbackUrl(source.organizationSlug);
  return {
    apiUrl: feedbackUrl,
    prompt: buildPromptSnippet(source, feedbackUrl),
    snippets: buildAgentFeedbackSnippets(source, feedbackUrl),
  };
}
