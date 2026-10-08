import { db } from "@notra/db/drizzle";
import { chatSessions, posts } from "@notra/db/schema";
import { toUIMessageStream } from "ai";
import { eq } from "drizzle-orm";

import { orchestrateStandaloneChat } from "./src/orchestration/orchestrate-standalone";
const organizationId = "7788faa1-f7da-4e2b-8463-72cc183b68c7";
const chatId = process.env.CHAT!;
const session = await db.query.chatSessions.findFirst({
  where: eq(chatSessions.id, chatId),
});
let messages = session!.messages as any[];
const lastUser = messages.findLastIndex((m) => m.role === "user");
messages = messages.slice(0, lastUser + 1);
console.log(
  "USER:",
  JSON.stringify(messages[lastUser].parts[0].text).slice(0, 700)
);
const { stream } = await orchestrateStandaloneChat({
  organizationId,
  chatId,
  userId: "e2e",
  messages,
  requestedModel: "auto",
  thinkingLevel: "low",
});
const reader = toUIMessageStream({
  stream: stream.stream,
  originalMessages: messages as never,
  generateMessageId: () => crypto.randomUUID(),
}).getReader();
let text = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) {
    break;
  }
  const v: any = value;
  if (v.type === "tool-input-available") {
    console.log("TOOL", v.toolName, JSON.stringify(v.input).slice(0, 500));
  }
  if (v.type === "tool-output-available") {
    console.log("  OUT", JSON.stringify(v.output).slice(0, 220));
  }
  if (v.type === "text-delta") {
    text += v.delta;
  }
}
console.log("TEXT:", text.slice(0, 400));
process.exit(0);
