import type {
  FeatureDetailCopy,
  FeaturePersona,
  FeaturePersonaCard,
  FeaturePersonaVisibilityRow,
} from "@/types/feature-detail-page";

export const PERSONAS_PAGE: FeatureDetailCopy = {
  meta: {
    path: "/features/personas",
    title: "Personas",
    description:
      "Notra asks ChatGPT, Claude, Gemini and Perplexity as each of your buyers and tracks your visibility per persona.",
    ogImageKey: "personas",
  },
  heroSubtitle:
    "A growth lead on a $500 budget and a founder on a free tier get different answers. Notra asks every engine as each of your buyers, so you see what each one is told.",
  signupSource: "feature_personas",
  overview: {
    heading: "A different answer for every buyer",
    description:
      "A single average hides which buyers you're losing. Personas split visibility by buyer, so you know whose questions you win and whose go to someone else.",
    facts: [
      {
        title: "Personas with memory",
        description:
          "Each persona remembers its background, what it tried before, its constraints and the tools it already uses.",
      },
      {
        title: "Visibility per persona",
        description:
          "Each buyer gets their own visibility line over time instead of one blended number.",
      },
    ],
  },
  steps: {
    heading: "Your buyers, in three steps",
    items: [
      {
        title: "Generate personas",
        description:
          "Notra drafts the buyer types most likely to ask AI about your category. Keep the ones that fit, edit or archive the rest.",
      },
      {
        title: "Give them memories",
        description:
          "Add what each buyer knows: their role, their stack, what they tried before and what rules a tool out.",
      },
      {
        title: "Scan as each one",
        description:
          "Every scan asks as each persona on every engine. You get the full answers and a visibility line per buyer.",
      },
    ],
  },
  cta: {
    heading: "See what AI tells each of your buyers",
    subcopy:
      "Generate a few personas and run a scan to read the answers. It's free to start.",
  },
};

export const PERSONAS_HERO_QUESTION =
  "Which tool should we use to track our brand in AI answers?";

export const PERSONAS_HEADLINE_LINE_ONE = "Ask ChatGPT";

export const PERSONAS_HEADLINE_CYCLE: FeaturePersona[] = [
  {
    name: "Maya",
    role: "Head of Growth",
    avatar: "/features/personas/maya.svg",
  },
  { name: "Daniel", role: "Founder", avatar: "/features/personas/daniel.svg" },
  {
    name: "Priya",
    role: "Content Lead",
    avatar: "/features/personas/priya.svg",
  },
  { name: "Ana", role: "PMM", avatar: "/features/personas/ana.svg" },
];

export const PERSONAS_HERO_CARDS: FeaturePersonaCard[] = [
  {
    name: "Maya Chen",
    role: "Head of Growth · Series B SaaS",
    avatar: "/features/personas/maya.svg",
    remembers: "Budget under $500 a month. SOC 2 is a must.",
    rank: 1,
  },
  {
    name: "Daniel Okafor",
    role: "Founder · Developer tools",
    avatar: "/features/personas/daniel.svg",
    remembers: "Team of four. Wants a free plan to start.",
    rank: 3,
  },
  {
    name: "Priya Raman",
    role: "Content Lead · Marketing agency",
    avatar: "/features/personas/priya.svg",
    remembers: "Runs 12 client brands. Needs reports per client.",
    rank: null,
  },
];

export const PERSONAS_VISIBILITY_ROWS: FeaturePersonaVisibilityRow[] = [
  {
    name: "Daniel Okafor",
    role: "Founder · Developer tools",
    avatar: "/features/personas/daniel.svg",
    ranks: { chatgpt: 1, claude: 2, gemini: 4, perplexity: 1 },
    visibility: "57%",
  },
  {
    name: "Maya Chen",
    role: "Head of Growth · B2B SaaS",
    avatar: "/features/personas/maya.svg",
    ranks: { chatgpt: 2, claude: 1, gemini: null, perplexity: 3 },
    visibility: "43%",
  },
  {
    name: "Ana Souza",
    role: "PMM · DevOps platform",
    avatar: "/features/personas/ana.svg",
    ranks: { chatgpt: 5, claude: null, gemini: 2, perplexity: null },
    visibility: "36%",
  },
  {
    name: "Priya Raman",
    role: "Content Lead · Agency",
    avatar: "/features/personas/priya.svg",
    ranks: { chatgpt: null, claude: null, gemini: null, perplexity: 6 },
    visibility: "14%",
  },
];
