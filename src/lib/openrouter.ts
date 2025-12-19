import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY must be set for AI to work.");
}

const headers = {
  "HTTP-Referer": "http://localhost:3000",
  "X-Title": "Notra",
};

export const openrouter = createOpenRouter({
  apiKey,
  headers,
});
