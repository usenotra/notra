import { beforeEach, expect, mock, test } from "bun:test";

import type { chatSessions } from "@notra/db/schema";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

let row:
  | Pick<
      typeof chatSessions.$inferSelect,
      "messages" | "deletedAt" | "externalChannelSource" | "externalChannelId"
    >
  | undefined;
const limit = mock(async () => (row ? [row] : []));
const where = mock((_condition: SQL | undefined) => ({ limit }));
const select = mock(() => ({ from: () => ({ where }) }));
const getRedis = mock(async (key: string) =>
  key.startsWith("chat:lastStopped:") ? "1" : "stream-one"
);
const permalink = mock(async () => "https://example.test/slack/thread");

mock.module("@notra/db/drizzle", () => ({ db: { select } }));
mock.module("@notra/ai/chat/config", () => ({
  getChatRedis: () => ({ get: getRedis }),
}));
mock.module("@/lib/slack/relay", () => ({
  parseSlackExternalChannelKey: () => ({
    teamId: "team",
    channelId: "channel",
    threadTs: "thread",
  }),
  getSlackThreadPermalink: permalink,
}));

const { loadChatHistoryPayload } = await import("../../src/lib/chat/history");

beforeEach(() => {
  row = {
    messages: [
      {
        id: "message-one",
        role: "user",
        parts: [{ type: "text", text: "Hi" }],
      },
    ],
    deletedAt: null,
    externalChannelSource: null,
    externalChannelId: null,
  };
  select.mockClear();
  where.mockClear();
  getRedis.mockClear();
  permalink.mockClear();
});

test("one scoped database read returns messages and both stream flags", async () => {
  const result = await loadChatHistoryPayload("org-one", "chat-one");
  expect(row?.messages).toEqual(result?.messages);
  expect(result?.lastResponseStopped).toBe(true);
  expect(result?.activeStreamId).toBe("stream-one");
  expect(select).toHaveBeenCalledTimes(1);
  expect(getRedis).toHaveBeenCalledTimes(2);
  const condition = where.mock.calls[0]?.[0];
  expect(condition).toBeDefined();
  if (!condition) {
    throw new Error("Missing query scope");
  }
  const query = new PgDialect().sqlToQuery(condition);
  expect(query.params).toEqual(["chat-one", "org-one"]);
  expect(query.sql).toContain('"chat_sessions"."content_id" is null');
});

test("deleted histories cannot return messages or Slack metadata", async () => {
  if (!row) {
    throw new Error("Missing fixture");
  }
  row.deletedAt = new Date();
  row.externalChannelSource = "slack";
  row.externalChannelId = "team:channel:thread";
  expect(await loadChatHistoryPayload("org-one", "chat-one")).toBeNull();
  expect(permalink).not.toHaveBeenCalled();
});

test("missing chats retain the empty-history contract", async () => {
  row = undefined;
  const result = await loadChatHistoryPayload("org-one", "chat-one");
  expect(result?.messages).toEqual([]);
  expect(result?.externalChannelId).toBeNull();
});

test("Slack histories retain their channel and permalink", async () => {
  if (!row) {
    throw new Error("Missing fixture");
  }
  row.externalChannelSource = "slack";
  row.externalChannelId = "team:channel:thread";
  const result = await loadChatHistoryPayload("org-one", "chat-one");
  expect(result?.externalChannelId).toEqual({
    source: "slack",
    id: "team:channel:thread",
  });
  expect(result?.slackThreadUrl).toBe("https://example.test/slack/thread");
  expect(select).toHaveBeenCalledTimes(1);
});
