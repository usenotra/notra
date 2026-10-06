import { logError } from "@notra/ai/utils/server-log";
import {
  getLinkedTwitterAccounts,
  isTwitterPublishConfigured,
} from "@notra/tools/utils/social-accounts";
import {
  Actions,
  Button,
  Card,
  type CardChild,
  type CardElement,
  CardText,
  RadioSelect,
  Select,
  SelectOption,
  type SlackEventContext,
  type SlackPostInput,
} from "eve/channels/slack";
import type {
  InputOption,
  InputRequest,
  InputRequestedStreamEvent,
} from "eve/client";

import { POST_TO_X_CONFIRM_ACTION_PREFIX } from "../constants/slack-post-x";
import { resolveSlackInstallation } from "./slack-installation";
import { savePendingPostToX } from "./slack-post-x";

function getDraftLabel(toolName: string): string | null {
  switch (toolName) {
    case "create_twitter_post":
      return "Tweet draft";
    case "create_linkedin_post":
      return "LinkedIn draft";
    case "create_blog_post":
      return "Blog post draft";
    case "create_changelog":
      return "Changelog draft";
    case "create_investor_update":
      return "Investor update draft";
    default:
      return null;
  }
}

function getToolInputString(request: InputRequest, key: string): string | null {
  const value = request.action.input[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function splitText(text: string): string[] {
  return text.match(/[\s\S]{1,3000}/gu) ?? [];
}

function splitCardText(text: string): CardChild[] {
  return splitText(text).map((chunk) => CardText(chunk));
}

function responseButton(requestId: string, option: InputOption, index: number) {
  return Button({
    id: `eve_input:${requestId}:button:${index}`,
    label: option.label,
    style: option.style,
    value: option.id,
  });
}

async function createTwitterDraftApprovalPost(
  request: InputRequest,
  channel: SlackEventContext
): Promise<SlackPostInput | null> {
  if (request.action.toolName !== "create_twitter_post") {
    return null;
  }

  const markdown = getToolInputString(request, "markdown");
  const approve = request.options?.find((option) => option.id === "approve");
  const deny = request.options?.find((option) => option.id === "deny");
  if (!(markdown && approve && deny)) {
    return null;
  }

  const linkedAccount = await resolveLinkedTwitterAccount(
    channel,
    markdown,
    request
  );

  const actionId = (index: number) =>
    `eve_input:${request.requestId}:button:${index}`;
  const text = (value: string) => ({
    type: "plain_text" as const,
    text: value,
    emoji: true,
  });

  const postToXButton = linkedAccount
    ? {
        type: "button",
        action_id: `${POST_TO_X_CONFIRM_ACTION_PREFIX}:${request.requestId}`,
        text: text(`Post to @${linkedAccount.username}`),
        value: JSON.stringify({
          requestId: request.requestId,
          callId: request.action.callId,
          username: linkedAccount.username,
        }),
      }
    : {
        type: "button",
        action_id: actionId(2),
        text: text("Post to X"),
        url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(markdown)}`,
        value: "post_to_x",
      };

  return {
    text: `Tweet draft\n${markdown}`,
    blocks: [
      { type: "header", text: text("Tweet draft") },
      ...splitText(markdown).map((chunk) => ({
        type: "section",
        text: { type: "mrkdwn", text: chunk },
      })),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: actionId(0),
            text: text("Save as draft"),
            style: "primary",
            value: approve.id,
          },
          postToXButton,
          {
            type: "button",
            action_id: actionId(1),
            text: text("Regenerate"),
            value: deny.id,
          },
        ],
      },
    ],
  };
}

async function resolveLinkedTwitterAccount(
  channel: SlackEventContext,
  markdown: string,
  request: InputRequest
) {
  if (!isTwitterPublishConfigured()) {
    return null;
  }
  const teamId = channel.state.teamId;
  if (!teamId) {
    return null;
  }
  try {
    const installation = await resolveSlackInstallation(teamId);
    if (!installation) {
      return null;
    }
    const accounts = await getLinkedTwitterAccounts(
      installation.organizationId
    );
    const account = accounts.at(0);
    if (!account) {
      return null;
    }
    const stored = await savePendingPostToX(request.action.callId, {
      organizationId: installation.organizationId,
      accountId: account.id,
      username: account.username,
      text: markdown,
    });
    return stored ? account : null;
  } catch (error) {
    logError("[agent] Failed to resolve linked X account", error, {
      slackTeamId: teamId,
      callId: request.action.callId,
    });
    return null;
  }
}

function createDraftApprovalCard(request: InputRequest): CardElement | null {
  const label = getDraftLabel(request.action.toolName);
  const markdown = getToolInputString(request, "markdown");
  const approve = request.options?.find((option) => option.id === "approve");
  const deny = request.options?.find((option) => option.id === "deny");

  if (!(label && markdown && approve && deny)) {
    return null;
  }

  const actions = [
    responseButton(
      request.requestId,
      { ...approve, label: "Save as draft", style: "primary" },
      0
    ),
  ];

  actions.push(
    responseButton(
      request.requestId,
      { ...deny, label: "Regenerate", style: "default" },
      1
    )
  );

  return Card({
    title: label,
    children: [...splitCardText(markdown), Actions(actions)],
  });
}

function createDefaultInputCard(request: InputRequest): CardElement {
  const children: CardChild[] = [];
  const options = request.options ?? [];

  if (request.display === "confirmation") {
    const serializedInput = JSON.stringify(request.action.input, null, 2);
    if (serializedInput !== "{}") {
      children.push(...splitCardText(`\`\`\`\n${serializedInput}\n\`\`\``));
    }
  }

  if (options.length > 0) {
    if (options.length <= 5) {
      children.push(
        Actions(
          options.map((option, index) =>
            responseButton(request.requestId, option, index)
          )
        )
      );
    } else {
      const selectOptions = options.map((option) =>
        SelectOption({
          description: option.description,
          label: option.label,
          value: option.id,
        })
      );
      const id = `eve_input:${request.requestId}`;
      children.push(
        Actions([
          options.length <= 6
            ? RadioSelect({
                id,
                label: request.prompt,
                options: selectOptions,
              })
            : Select({
                id,
                label: request.prompt,
                options: selectOptions,
                placeholder: "Choose an option",
              }),
        ])
      );
    }
  } else {
    children.push(
      Actions([
        Button({
          id: `eve_input_freeform:${request.requestId}`,
          label: "Type your answer",
          style: "primary",
          value: request.requestId,
        }),
      ])
    );
  }

  return Card({ title: request.prompt, children });
}

export async function handleSlackInputRequested(
  data: InputRequestedStreamEvent["data"],
  channel: SlackEventContext
) {
  for (const request of data.requests) {
    await channel.thread.post(
      (await createTwitterDraftApprovalPost(request, channel)) ??
        createDraftApprovalCard(request) ??
        createDefaultInputCard(request)
    );
  }
}
