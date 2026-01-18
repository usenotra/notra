import Firecrawl from "@mendable/firecrawl-js";

type FirecrawlClient = InstanceType<typeof Firecrawl>;

let firecrawlClient: FirecrawlClient | null = null;

export function getFirecrawlClient(): FirecrawlClient {
  if (firecrawlClient) {
    return firecrawlClient;
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "API key is required for the cloud API. Set FIRECRAWL_API_KEY env or pass apiKey.",
    );
  }

  firecrawlClient = new Firecrawl({
    apiKey,
  });

  return firecrawlClient;
}
