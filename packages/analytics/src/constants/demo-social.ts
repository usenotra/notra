/** How far back the demo's generated social history reaches. */
export const DEMO_SOCIAL_HISTORY_DAYS = 90;

/** The demo started publishing through Notra this many days ago. */
export const DEMO_SOCIAL_NOTRA_ADOPTED_DAYS_AGO = 75;

/** Engagement lifts once posts are written with Notra. */
export const DEMO_SOCIAL_NOTRA_LIFT = 1.35;

/** Probability of a post on a given day, per account kind and provider. */
export const DEMO_SOCIAL_POST_CHANCE = {
  connected: { twitter: 0.75, linkedin: 0.4 },
  tracked: { twitter: 0.45, linkedin: 0.25 },
} as const;

/** Follower count today, before per-account jitter. */
export const DEMO_SOCIAL_BASE_FOLLOWERS = {
  connected: { twitter: 4800, linkedin: 2300 },
  tracked: { twitter: 9000, linkedin: 5000 },
} as const;

/** Median impressions per post, before per-post jitter. */
export const DEMO_SOCIAL_BASE_IMPRESSIONS = {
  connected: { twitter: 2600, linkedin: 1500 },
  tracked: { twitter: 3400, linkedin: 1900 },
} as const;

/** Daily follower growth rate, compounded backwards from today. */
export const DEMO_SOCIAL_DAILY_GROWTH = 0.0035;

/** Local posting hours the generator picks from. */
export const DEMO_SOCIAL_POSTING_HOURS = [
  8, 9, 10, 11, 13, 14, 16, 17,
] as const;

export const DEMO_SOCIAL_OWN_POSTS = {
  twitter: [
    'Shipped: Smart Search now finds the decision, not just the meeting. Ask "what did we agree on pricing?" and get the answer with the timestamp.',
    "Async standups went from 25 minutes of talking to 3 minutes of reading. Here's the template our own team uses 🧵",
    "New: action items sync straight into Linear. No more copy-pasting from meeting notes.",
    "We rewrote our transcription pipeline. Notes land 4× faster after a call ends.",
    "Hot take: most meetings should be a doc. The rest should have great notes.",
    "EU data residency is live. Your meeting notes can now stay in Frankfurt.",
    "Changelog: speaker labels are 30% more accurate on calls with 6+ people.",
    "The best meeting note is the one nobody had to write. Quick demo of auto-summaries 👇",
    "Small thing, big deal: you can now search across every meeting in a workspace with ⌘K.",
    "How we run planning with zero status meetings — a thread.",
    "Customer story: a 40-person eng team cut recurring meetings by a third in one quarter.",
    "Dark mode for the desktop app is here. You asked, a lot.",
  ],
  linkedin: [
    'We asked 200 engineering leads what slows their teams down. "Meetings nobody remembers" came up more than any tool. Here\'s what we learned.',
    "Today we're launching Smart Search: ask a question in plain language and get the exact moment a decision was made, across every meeting.",
    "Remote teams don't need fewer meetings — they need better memory. A few lessons from running a fully async company for two years.",
    "EU data residency is now available for every plan. Meeting data for European workspaces stays in the EU, end to end.",
    "Our Q3 product recap: faster transcription, Linear sync, and a brand-new search experience. Thank you to everyone who sent feedback.",
    "Hiring: we're looking for a senior product designer who cares about calm software. Remote, Europe time zones.",
    "What makes a good meeting summary? We reviewed 10,000 of them. Three patterns stood out.",
  ],
} as const;

export const DEMO_SOCIAL_TRACKED_POSTS = [
  "New release: faster exports and a refreshed editor.",
  "Five tips to run better one-on-ones.",
  "We're hiring across product and engineering.",
  "Join our live webinar on async collaboration next week.",
  "Our integration with Slack just got a lot smarter.",
  "Customer spotlight: how a design agency saves 6 hours a week.",
  "The state of remote work in 2026 — our annual report is out.",
  "Productivity isn't about more tools. It's about fewer handoffs.",
] as const;
