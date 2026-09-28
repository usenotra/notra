import { afterEach, expect, mock, test } from "bun:test";

import {
  createSlackConnectChannelWithInvite,
  hasSlackConnectConfigured,
} from "./slack";

const originalFetch = globalThis.fetch;
const originalToken = process.env.SLACK_BOT_TOKEN;
const originalMembers = process.env.SLACK_SUPPORT_MEMBER_IDS;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) {
    delete process.env.SLACK_BOT_TOKEN;
  } else {
    process.env.SLACK_BOT_TOKEN = originalToken;
  }
  if (originalMembers === undefined) {
    delete process.env.SLACK_SUPPORT_MEMBER_IDS;
  } else {
    process.env.SLACK_SUPPORT_MEMBER_IDS = originalMembers;
  }
});

test("invites every configured support member before the Slack Connect recipient", async () => {
  process.env.SLACK_BOT_TOKEN = "test-token";
  process.env.SLACK_SUPPORT_MEMBER_IDS = " U0BQLJX73C4, U0AL47LV97S ";

  const requests: { method: string; body: unknown }[] = [];
  globalThis.fetch = mock(async (url, options) => {
    const method = String(url).split("/").at(-1) ?? "";
    requests.push({ method, body: JSON.parse(String(options?.body)) });
    if (method === "conversations.create") {
      return Response.json({
        ok: true,
        channel: { id: "C123", name: "support" },
      });
    }
    if (method === "conversations.inviteShared") {
      return Response.json({ ok: true, invite_id: "I123" });
    }
    return Response.json({ ok: true });
  });

  await createSlackConnectChannelWithInvite({
    channelName: "support",
    email: "customer@example.com",
  });

  expect(requests.map(({ method }) => method)).toEqual([
    "conversations.create",
    "conversations.invite",
    "conversations.invite",
    "conversations.inviteShared",
  ]);
  expect(requests.slice(1, 3).map(({ body }) => body)).toEqual([
    { channel: "C123", users: "U0BQLJX73C4" },
    { channel: "C123", users: "U0AL47LV97S" },
  ]);
});

test("requires at least one support member", async () => {
  process.env.SLACK_BOT_TOKEN = "test-token";
  process.env.SLACK_SUPPORT_MEMBER_IDS = " , ";
  expect(hasSlackConnectConfigured()).toBe(false);
  await expect(
    createSlackConnectChannelWithInvite({
      channelName: "support",
      email: "customer@example.com",
    })
  ).rejects.toMatchObject({ variable: "SLACK_SUPPORT_MEMBER_IDS" });
});
