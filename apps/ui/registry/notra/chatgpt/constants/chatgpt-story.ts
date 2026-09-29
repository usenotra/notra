import type {
  ChatgptActivitySite,
  ChatgptActivitySource,
  ChatgptStoryMessage,
  ChatgptStoryReasoningStep,
  ChatgptStorySearch,
} from "../types/chatgpt";

export const CHATGPT_STORY_SITES: ChatgptActivitySite[] = [
  { domain: "reuters.com", label: "www.reuters.com" },
  { domain: "theguardian.com", label: "www.theguardian.com" },
  { domain: "apnews.com", label: "apnews.com" },
  { domain: "bbc.com", label: "www.bbc.com" },
  { domain: "ft.com", label: "www.ft.com" },
  { domain: "spiegel.de", label: "www.spiegel.de" },
];

export const CHATGPT_STORY_SOURCES: ChatgptActivitySource[] = [
  {
    domain: "reuters.com",
    id: "src-1",
    publisher: "Reuters",
    snippet:
      "Foreign ministers in Ottawa said a coordinated package remains on the table after overnight consultations.",
    timeLabel: "Today — 3 hours ago",
    title: "G7 ministers weigh new sanctions as Geneva talks stall",
  },
  {
    domain: "apnews.com",
    id: "src-2",
    publisher: "AP News",
    snippet:
      "Negotiators left the session without a timetable, citing unresolved security guarantees.",
    timeLabel: "Today — 4 hours ago",
    title: "Ceasefire talks in Geneva hit another delay",
  },
  {
    domain: "theguardian.com",
    id: "src-3",
    publisher: "The Guardian",
    snippet:
      "Premiums jumped again as operators rerouted tankers away from the strait.",
    timeLabel: "Today — 5 hours ago",
    title: "Shipping insurers raise rates after Hormuz disruption",
  },
  {
    domain: "ft.com",
    id: "src-4",
    publisher: "Financial Times",
    snippet: "The DAX tracked overnight gains in megacap software and chips.",
    timeLabel: "Today — 6 hours ago",
    title: "US tech earnings lift European markets at the open",
  },
  {
    domain: "spiegel.de",
    id: "src-5",
    publisher: "Spiegel",
    snippet:
      "Parliamentary leaders want tighter fiscal language ahead of this week’s Bundestag session.",
    timeLabel: "Today — 7 hours ago",
    title: "Union demands changes before growth package vote",
  },
  {
    domain: "bbc.com",
    id: "src-6",
    publisher: "BBC",
    snippet:
      "Member states are still split on how national regulators should share oversight.",
    timeLabel: "Today — 8 hours ago",
    title: "EU officials outline next steps on AI Act enforcement",
  },
];

export const CHATGPT_STORY_SEARCH: ChatgptStorySearch = {
  sites: CHATGPT_STORY_SITES,
  sourceCount: 91,
  sources: CHATGPT_STORY_SOURCES,
  websites: 6,
};

const CHATGPT_STORY_SEARCH_NEWS: ChatgptStorySearch = {
  sites: CHATGPT_STORY_SITES.slice(0, 3),
  sourceCount: 42,
  sources: CHATGPT_STORY_SOURCES.slice(0, 3),
  websites: 3,
};

const CHATGPT_STORY_SEARCH_MARKETS: ChatgptStorySearch = {
  sites: CHATGPT_STORY_SITES.slice(3, 5),
  sourceCount: 49,
  sources: CHATGPT_STORY_SOURCES.slice(3, 6),
  websites: 2,
};

const CHATGPT_STORY_REASONING_STEPS: ChatgptStoryReasoningStep[] = [
  {
    kind: "text",
    text: "Sure. I'll pull together the biggest news from **today, Monday, August 17, 2026**.",
  },
  { kind: "search", search: CHATGPT_STORY_SEARCH_NEWS },
  { kind: "text", muted: true, text: "Markets and economy" },
  { kind: "search", search: CHATGPT_STORY_SEARCH_MARKETS },
];

export const CHATGPT_STORY_THREAD: ChatgptStoryMessage[] = [
  { from: "user", id: "u-1", text: "What are the biggest news stories today?" },
  {
    from: "assistant",
    id: "a-1",
    reasoning: {
      search: CHATGPT_STORY_SEARCH,
      seconds: 21,
      steps: CHATGPT_STORY_REASONING_STEPS,
      text: "Sure. I'll pull together the biggest news from **today, Monday, August 17, 2026**.",
    },
    text: "Here's where things stand on **Monday, August 17, 2026**:\n\nG7 foreign ministers are weighing new sanctions in Ottawa while the Geneva ceasefire talks stall again. {{src-1,src-2}} Markets opened higher after strong US tech earnings. {{src-4}}",
  },
];

export const CHATGPT_STORY_REPLIES = [
  "Got it. Let me know when you want to keep going.",
  "Great. I'm here.",
  "Sure. What's next?",
] as const;

export const CHATGPT_SMALL_TALK: ChatgptStoryMessage[] = [
  { from: "user", id: "st-u-1", text: "how r you?" },
  {
    from: "assistant",
    id: "st-a-1",
    text: "I'm good 😭 ready when you are. What's up with you?",
  },
];
