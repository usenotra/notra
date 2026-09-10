import { expect, mock, test } from "bun:test";

let source: string | null = null;
let channelId: string | null = null;
mock.module("@notra/db/drizzle", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "chat",
              title: "Chat",
              createdAt: new Date(0),
              updatedAt: new Date(0),
              pinnedAt: null,
              externalChannelSource: source,
              externalChannelId: channelId,
            },
          ],
        }),
      }),
    }),
  },
}));
const { getStandaloneChatSession, getChatSession, getChatSessionForInbox } =
  await import("./history");

test("agent sessions are hidden from standalone retrieval but available to the agent inbox", async () => {
  source = "agent";
  channelId = null;
  expect(await getStandaloneChatSession("org", "chat")).toBeNull();
  expect(await getChatSession("org", "chat")).not.toBeNull();
  expect(await getChatSessionForInbox("org", "chat", "agent")).not.toBeNull();
});

test.each([null, "dashboard", "slack", "discord"])(
  "standalone retrieval preserves %s sessions",
  async (channel) => {
    source = channel;
    channelId = channel === "slack" || channel === "discord" ? "channel" : null;
    expect(await getStandaloneChatSession("org", "chat")).not.toBeNull();
    expect(await getChatSessionForInbox("org", "chat", "agent")).toBeNull();
  }
);
