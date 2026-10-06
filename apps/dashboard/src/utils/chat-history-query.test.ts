import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";

import { QueryClient, QueryObserver } from "@tanstack/react-query";

import { chatHistoryQueryOptions } from "./chat-history-query";

const history = {
  chatId: "chat-one",
  messages: [
    {
      id: "message-one",
      role: "user" as const,
      parts: [{ type: "text" as const, text: "Hi" }],
    },
  ],
  lastResponseStopped: false,
  activeStreamId: null,
  externalChannelId: { source: "slack" as const, id: "team:channel:thread" },
  slackThreadUrl: "https://example.test/slack/thread",
};

const clients: QueryClient[] = [];
const fetchSpy = spyOn(globalThis, "fetch");

afterAll(() => fetchSpy.mockRestore());

afterEach(() => {
  for (const client of clients.splice(0)) {
    client.clear();
  }
  fetchSpy.mockReset();
});

describe("chat history query", () => {
  test("a prefetched chat opens from the same complete cache without another request", async () => {
    fetchSpy.mockResolvedValue(Response.json({ json: history }));
    const client = new QueryClient();
    clients.push(client);
    const options = chatHistoryQueryOptions("org-one", "chat-one");

    await client.prefetchQuery(options);
    const result = await client.fetchQuery(
      chatHistoryQueryOptions("org-one", "chat-one")
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(history);
    expect(result?.slackThreadUrl).toBe(history.slackThreadUrl);
    expect(client.getQueryData(options.queryKey)?.messages).toEqual(
      history.messages
    );
  });

  test("hover and navigation share an in-flight history request", async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    fetchSpy.mockReturnValue(pending);
    const client = new QueryClient();
    clients.push(client);

    const preload = client.prefetchQuery(
      chatHistoryQueryOptions("org-one", "chat-one")
    );
    const navigation = client.fetchQuery(
      chatHistoryQueryOptions("org-one", "chat-one")
    );
    resolveResponse(Response.json({ json: history }));

    await preload;
    expect(await navigation).toEqual(history);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("history is isolated by organization and chat", async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(Response.json({ json: history }))
    );
    const client = new QueryClient();
    clients.push(client);

    await client.fetchQuery(chatHistoryQueryOptions("org-one", "chat-one"));
    await client.fetchQuery(chatHistoryQueryOptions("org-two", "chat-one"));
    await client.fetchQuery(chatHistoryQueryOptions("org-one", "chat-two"));

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  test("new chats and unresolved organizations do not fetch history", () => {
    const client = new QueryClient();
    clients.push(client);
    for (const options of [
      chatHistoryQueryOptions("org-one", undefined),
      chatHistoryQueryOptions("", "chat-one"),
    ]) {
      const observer = new QueryObserver(client, options);
      const unsubscribe = observer.subscribe(() => undefined);
      expect(observer.getCurrentResult().fetchStatus).toBe("idle");
      unsubscribe();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
