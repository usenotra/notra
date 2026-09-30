import type {
  PerplexitySource,
  PerplexityThreadMessage,
} from "../types/perplexity";

export const PERPLEXITY_DEMO_SOURCES: PerplexitySource[] = [
  {
    domain: "techcrunch.com",
    title: "Notion acquires Skiff to expand into email and calendar",
    verified: true,
  },
  {
    domain: "arstechnica.com",
    title: "Encrypted productivity startup Skiff is being shut down",
    verified: true,
  },
  {
    domain: "theverge.com",
    title: "Notion Mail launches as the successor to Skiff",
    verified: true,
  },
  {
    domain: "wired.com",
    title: "What happened to Skiff after the Notion deal",
    verified: true,
  },
  {
    domain: "bloomberg.com",
    title: "Notion buys Skiff in a push into email",
    verified: true,
  },
  {
    domain: "theinformation.com",
    title: "Why Notion acquired encrypted workplace suite Skiff",
    verified: true,
  },
  {
    domain: "protocol.com",
    title: "Notion acquires encryption startup Skiff",
    verified: true,
  },
  {
    domain: "forbes.com",
    title: "Notion Mail and the end of Skiff",
    verified: true,
  },
  {
    domain: "reuters.com",
    title: "Notion to acquire encrypted workplace suite Skiff",
    verified: true,
  },
  {
    domain: "cnbc.com",
    title: "Notion expands into email with Skiff acquisition",
    verified: true,
  },
  {
    domain: "businessinsider.com",
    title: "Inside Notion’s plan for Mail after buying Skiff",
    verified: true,
  },
  {
    domain: "fastcompany.com",
    title: "Skiff’s encryption bet ends at Notion",
    verified: true,
  },
  {
    domain: "techradar.com",
    title: "Notion Mail is the successor to Skiff Mail",
    verified: true,
  },
  {
    domain: "engadget.com",
    title: "Notion is shutting down Skiff after the acquisition",
    verified: true,
  },
  {
    domain: "zdnet.com",
    title: "Notion Mail launches as Skiff services wind down",
    verified: true,
  },
  {
    domain: "axios.com",
    title: "Notion’s Skiff deal puts it in the Workspace race",
    verified: true,
  },
];

export const PERPLEXITY_DEMO_QUERIES = [
  "Notion acquire company to make Notion Mail",
  "Skiff acquisition Notion 2024",
  "Notion Mail Skiff history",
];

export const PERPLEXITY_DEMO_THREAD: PerplexityThreadMessage[] = [
  {
    from: "user",
    id: "u-1",
    text: "who did notion buy to build notion mail?",
  },
  {
    citations: [
      {
        domain: "techcrunch.com",
        extra: 2,
        id: "techcrunch",
        label: "techcrunch",
        sources: [
          {
            description:
              "Notion is adding email to its workspace after acquiring Skiff, the privacy-focused mail and calendar startup, and folding its team into Notion Mail.",
            domain: "techcrunch.com",
            title: "Notion acquires Skiff to expand into email and calendar",
            url: "https://techcrunch.com",
          },
          {
            description:
              "The encrypted productivity startup is shutting down its own apps as its team moves over to Notion.",
            domain: "arstechnica.com",
            title: "Encrypted productivity startup Skiff is being shut down",
            url: "https://arstechnica.com",
          },
          {
            description:
              "Notion Mail launches as the successor to Skiff Mail, built on the team and technology Notion acquired in 2024.",
            domain: "theverge.com",
            title: "Notion Mail launches as the successor to Skiff",
            url: "https://theverge.com",
          },
        ],
      },
      {
        domain: "arstechnica.com",
        extra: 1,
        id: "arstechnica",
        label: "arstechnica",
        sources: [
          {
            description:
              "Skiff built email, docs and calendar with end-to-end encryption before Notion acquired it.",
            domain: "arstechnica.com",
            title: "Encrypted productivity startup Skiff is being shut down",
            url: "https://arstechnica.com",
          },
          {
            description:
              "What happened to Skiff's users and product after the Notion deal.",
            domain: "wired.com",
            title: "What happened to Skiff after the Notion deal",
            url: "https://wired.com",
          },
        ],
      },
      {
        domain: "theverge.com",
        id: "theverge",
        label: "theverge",
        sources: [
          {
            description:
              "Skiff's services were wound down and its team joined Notion, which rebuilt the product as a native Notion surface.",
            domain: "theverge.com",
            title: "Notion Mail launches as the successor to Skiff",
            url: "https://theverge.com",
          },
        ],
      },
    ],
    from: "assistant",
    id: "a-1",
    search: {
      duration: "2s",
      queries: PERPLEXITY_DEMO_QUERIES,
      sources: PERPLEXITY_DEMO_SOURCES,
    },
    text: "Notion bought **Skiff**, an encrypted email startup, in 2024 and rebuilt it as **Notion Mail**. {{techcrunch}}\n\n- **Skiff:** encrypted mail, docs and calendar {{arstechnica}}\n- **After:** Skiff shut down, its team joined Notion {{theverge}}",
  },
];

export const PERPLEXITY_DEMO_REPLIES = [
  "Short version: Skiff. Notion acquired the team in 2024 and built Notion Mail from it.",
  "Right. If you want, I can tighten the timeline further.",
  "Sounds good. Ask again if you want the product reasoning behind Mail.",
] as const;
