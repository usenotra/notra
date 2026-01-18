import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const headers = {
  "HTTP-Referer": "https://usenotra.com",
  "X-Title": "Notra",
};

type OpenRouterClient = ReturnType<typeof createOpenRouter>;

let openrouterClient: OpenRouterClient | null = null;

function getOpenRouterClient(): OpenRouterClient {
  if (openrouterClient) {
    return openrouterClient;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY must be set for AI to work.");
  }

  openrouterClient = createOpenRouter({
    apiKey,
    headers,
  });

  return openrouterClient;
}

type OpenRouterArgs = Parameters<OpenRouterClient>;
type OpenRouterResult = ReturnType<OpenRouterClient>;

export const openrouter = (...args: OpenRouterArgs): OpenRouterResult => {
  const client = getOpenRouterClient();
  return client(...args);
};
