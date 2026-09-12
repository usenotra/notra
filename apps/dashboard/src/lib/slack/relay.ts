import { createHmac } from "node:crypto";

import { SLACK_RELAY_EVENT_TYPE } from "@notra/ai/constants/chat";
import {
  getSlackIntegrationBotToken,
  getSlackIntegrationByTeamId,
} from "@notra/ai/integrations/slack-workspace";
import { redis } from "@notra/ai/utils/redis";
import {
  slackExternalChannelKeySchema,
  slackPermalinkResponseSchema,
  slackPostMessageResponseSchema,
  slackRepliesResponseSchema,
} from "@notra/schemas/dashboard/slack-relay";

import type { SlackRelayTarget } from "@/types/slack-relay";

const TRAILING_SLASH_REGEX = /\/$/u;

export function parseSlackExternalChannelKey(
  key: string
): SlackRelayTarget | null {
  const parsed = slackExternalChannelKeySchema.safeParse(key);
  if (!parsed.success) {
    return null;
  }
  const [teamId, channelId, threadTs] = parsed.data.split(":");
  if (!(teamId && channelId && threadTs)) {
    return null;
  }
  return { teamId, channelId, threadTs };
}

async function resolveRelayBotToken(teamId: string): Promise<string> {
  const integration = await getSlackIntegrationByTeamId(teamId);
  if (integration?.enabled) {
    return getSlackIntegrationBotToken(integration);
  }
  const envToken = process.env.SLACK_AGENT_BOT_TOKEN?.trim();
  if (!envToken) {
    throw new Error("No Slack installation found for this workspace");
  }
  return envToken;
}

export async function postSlackRelayMessage(input: {
  target: SlackRelayTarget;
  text: string;
  userName: string;
  chatId: string;
  organizationId: string;
}): Promise<{ ts: string }> {
  const token = await resolveRelayBotToken(input.target.teamId);

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: input.target.channelId,
      thread_ts: input.target.threadTs,
      text: `*${input.userName}:* ${input.text}`,
      metadata: {
        event_type: SLACK_RELAY_EVENT_TYPE,
        event_payload: {
          chat_id: input.chatId,
          organization_id: input.organizationId,
          user_name: input.userName,
          text: input.text,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack relay post failed with status ${response.status}`);
  }
  const parsed = slackPostMessageResponseSchema.safeParse(
    await response.json()
  );
  if (!(parsed.success && parsed.data.ok && parsed.data.ts)) {
    throw new Error(
      `Slack relay post failed: ${parsed.success ? (parsed.data.error ?? "unknown_error") : "invalid_response"}`
    );
  }

  return { ts: parsed.data.ts };
}

const PERMALINK_CACHE_TTL_SECONDS = 60 * 60 * 24;

function permalinkCacheKey(target: SlackRelayTarget) {
  return `slack:permalink:${target.teamId}:${target.channelId}:${target.threadTs}`;
}

export async function getSlackThreadPermalink(
  target: SlackRelayTarget
): Promise<string | null> {
  try {
    if (redis) {
      const cached = await redis.get<string>(permalinkCacheKey(target));
      if (typeof cached === "string" && cached.length > 0) {
        return cached;
      }
    }
    const token = await resolveRelayBotToken(target.teamId);
    const response = await fetch(
      `https://slack.com/api/chat.getPermalink?channel=${encodeURIComponent(target.channelId)}&message_ts=${encodeURIComponent(target.threadTs)}`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      return null;
    }
    const parsed = slackPermalinkResponseSchema.safeParse(
      await response.json()
    );
    const permalink =
      parsed.success && parsed.data.ok && parsed.data.permalink
        ? parsed.data.permalink
        : null;
    if (permalink && redis) {
      await redis.set(permalinkCacheKey(target), permalink, {
        ex: PERMALINK_CACHE_TTL_SECONDS,
      });
    }
    return permalink;
  } catch {
    return null;
  }
}

function requireRelayEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Slack approval relay`);
  }
  return value;
}

async function findApprovalCard(input: {
  token: string;
  target: SlackRelayTarget;
  requestId: string;
  approved: boolean;
}) {
  const response = await fetch(
    `https://slack.com/api/conversations.replies?channel=${encodeURIComponent(input.target.channelId)}&ts=${encodeURIComponent(input.target.threadTs)}&limit=50`,
    { headers: { authorization: `Bearer ${input.token}` } }
  );
  if (!response.ok) {
    throw new Error(
      `Slack approval relay could not load the thread (${response.status})`
    );
  }
  const parsed = slackRepliesResponseSchema.safeParse(await response.json());
  if (!(parsed.success && parsed.data.ok)) {
    throw new Error("Slack approval relay could not load the thread");
  }

  const actionPrefix = `eve_input:${input.requestId}:button:`;
  const wantedValue = input.approved ? "approve" : "deny";
  for (const message of parsed.data.messages ?? []) {
    if (!message.bot_id) {
      continue;
    }
    for (const block of message.blocks ?? []) {
      for (const element of block.elements ?? []) {
        if (
          element.action_id?.startsWith(actionPrefix) &&
          element.value === wantedValue
        ) {
          return {
            cardTs: message.ts,
            blocks: message.blocks ?? [],
            actionId: element.action_id,
            value: element.value,
          };
        }
      }
    }
  }
  return null;
}

export async function postSlackApprovalInteraction(input: {
  target: SlackRelayTarget;
  requestId: string;
  approved: boolean;
  userName: string;
}): Promise<boolean> {
  const token = await resolveRelayBotToken(input.target.teamId);
  const signingSecret = requireRelayEnv("SLACK_AGENT_SIGNING_SECRET");
  const agentUrl = requireRelayEnv("EVE_NOTRA_AGENT_URL");

  const card = await findApprovalCard({
    token,
    target: input.target,
    requestId: input.requestId,
    approved: input.approved,
  });
  if (!card) {
    return false;
  }

  const payload = {
    type: "block_actions",
    team: { id: input.target.teamId },
    user: {
      id: "U0DASHBOARD",
      username: input.userName,
      name: input.userName,
    },
    channel: { id: input.target.channelId },
    message: {
      ts: card.cardTs,
      thread_ts: input.target.threadTs,
      blocks: card.blocks,
    },
    actions: [
      {
        action_id: card.actionId,
        value: card.value,
        text: { type: "plain_text", text: input.approved ? "Approve" : "Deny" },
      },
    ],
  };
  const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = `v0=${createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex")}`;

  const response = await fetch(
    `${agentUrl.replace(TRAILING_SLASH_REGEX, "")}/eve/v1/slack`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-slack-request-timestamp": String(timestamp),
        "x-slack-signature": signature,
      },
      body,
    }
  );
  if (!response.ok) {
    throw new Error(
      `Slack approval relay was rejected by the agent (${response.status})`
    );
  }
  return true;
}
