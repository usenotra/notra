import { expect, test } from "bun:test";

import {
  channelIdForInbox,
  chatSurfaceFromChannelSource,
  isRelayChannelSource,
  isStandaloneInboxSurface,
  sessionMatchesInbox,
} from "./chat-surface";

test("maps stored channel sources onto chat surfaces", () => {
  expect(chatSurfaceFromChannelSource("agent")).toBe("agent");
  expect(chatSurfaceFromChannelSource("slack")).toBe("slack");
  expect(chatSurfaceFromChannelSource("discord")).toBe("discord");
  expect(chatSurfaceFromChannelSource("dashboard")).toBe("studio");
  expect(chatSurfaceFromChannelSource(null)).toBe("studio");
});

test("standalone inbox includes studio and relay surfaces, not agent", () => {
  expect(isStandaloneInboxSurface("studio")).toBe(true);
  expect(isStandaloneInboxSurface("slack")).toBe(true);
  expect(isStandaloneInboxSurface("agent")).toBe(false);
});

test("session inbox matching does not sniff raw source strings at call sites", () => {
  expect(
    sessionMatchesInbox({ externalChannelId: { source: "agent" } }, "agent")
  ).toBe(true);
  expect(
    sessionMatchesInbox({ externalChannelId: { source: "dashboard" } }, "agent")
  ).toBe(false);
  expect(
    sessionMatchesInbox(
      { externalChannelId: { source: "slack", id: "c" } },
      "standalone"
    )
  ).toBe(true);
});

test("agent inbox persistence uses the surface helper instead of a raw source string", () => {
  expect(channelIdForInbox("agent")).toEqual({ source: "agent" });
  expect(channelIdForInbox("standalone")).toBeNull();
});

test("only slack and discord are claimable relay channel sources", () => {
  expect(isRelayChannelSource("slack")).toBe(true);
  expect(isRelayChannelSource("discord")).toBe(true);
  expect(isRelayChannelSource("agent")).toBe(false);
  expect(isRelayChannelSource("dashboard")).toBe(false);
});
