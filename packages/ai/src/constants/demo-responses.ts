import type { DemoChatScenario } from "@notra/ai/types/demo-model";

/**
 * Canned model output for the public demo (NOTRA_DEMO_MODE). The demo has no
 * provider keys; every model call is answered from here. All copy is about
 * Fieldnote, the fictional company the demo workspace belongs to.
 */

export const DEMO_MODEL_PROVIDER = "notra-demo";
export const DEMO_STREAM_CHUNK_DELAY_MS = 18;
export const DEMO_FAKE_MAX_DEPTH = 6;
/** German words that are not also English; two distinct hits mean German. */
export const DEMO_GERMAN_WORDS =
  /\b(ich|und|nicht|bitte|wie|welche[rsnm]?|warum|schreib\w*|erstell\w*|zeig\w*|mein\w*|unser\w*|sind|wir|der|das|ist|für|über|einen?|mit|auf|dem|den|sichtbar\w*)\b/gi;
export const DEMO_GERMAN_MIN_WORDS = 2;

/** Tools that mark an unattended writer agent (schedules, events, GEO writer). */
export const DEMO_BACKGROUND_WRITER_TOOLS = [
  "createPost",
  "skip",
  "fail",
] as const;

/** Post a background writer saves, by the content type named in its prompt. */
export const DEMO_BACKGROUND_POSTS: readonly {
  pattern: RegExp;
  title: string;
  markdown: string;
}[] = [
  {
    pattern: /changelog|release notes/i,
    title: "Changelog: templates and smarter search",
    markdown: `## New

- **Meeting templates.** Start 1:1s, retros and customer calls with a shared structure.
- **Linear sync.** Send action items to Linear with one click; the issue links back to the transcript.

## Improved

- **Smart Search** now prefers the latest decision when a topic was revisited.
- Summaries stream in for meetings under 30 minutes.

## Fixed

- Calendar sync no longer duplicates recurring meetings after a time zone change.`,
  },
  {
    pattern: /linkedin/i,
    title: "This week at Fieldnote",
    markdown: `Three things we shipped this week:

→ Meeting templates for 1:1s, retros and customer calls
→ Action items straight into Linear
→ Smart Search that knows which decision is the latest

Small changes, fewer "wait, what did we decide?" moments.`,
  },
  {
    pattern: /twitter|tweet|\bx post\b/i,
    title: "Weekly ship log",
    markdown: `Shipped in Fieldnote this week:

• meeting templates
• action items → Linear
• Smart Search picks the latest decision

Fewer "what did we decide?" pings 🙌`,
  },
  {
    pattern: /.*/,
    title: "How we made meeting decisions searchable",
    markdown: `Most teams don't lose decisions in meetings. They lose them *after* meetings.

This month we shipped three things that close that gap: meeting templates, Linear sync for action items, and a Smart Search that prefers the latest decision when a topic was revisited.

## Why the latest decision matters

Plans change. When your team revisits pricing three times, the answer you need is the third one, with a link to the earlier discussions.`,
  },
];

/** Which create tool a request most likely wants, by keyword. */
export const DEMO_TOOL_HINTS: readonly { pattern: RegExp; toolName: string }[] =
  [
    { pattern: /linkedin/i, toolName: "createLinkedInPost" },
    {
      pattern: /\b(tweet|twitter|thread|x post)\b/i,
      toolName: "createTwitterPost",
    },
    { pattern: /changelog|release notes/i, toolName: "createChangelog" },
    { pattern: /\b(blog|article)\b/i, toolName: "createBlogPost" },
  ];

export const DEMO_FAKE_TITLES = {
  en: [
    "How Fieldnote turns meetings into searchable decisions",
    "5 ways product teams lose decisions (and how to stop it)",
    "Fieldnote vs Quillboard: an honest comparison",
    "Async standups with AI meeting notes",
  ],
  de: [
    "Wie Fieldnote Meetings in durchsuchbare Entscheidungen verwandelt",
    "5 Gründe, warum Produktteams Entscheidungen verlieren",
    "Fieldnote vs. Quillboard: ein ehrlicher Vergleich",
    "Asynchrone Standups mit KI-Meeting-Notizen",
  ],
} as const;

export const DEMO_FAKE_SENTENCES = {
  en: [
    "Fieldnote is mentioned more often when answers compare meeting search features.",
    "Competitors win prompts that ask about integrations with Slack and Linear.",
    "A comparison page would give AI assistants a source to cite.",
  ],
  de: [
    "Fieldnote wird häufiger genannt, wenn Antworten Suchfunktionen vergleichen.",
    "Konkurrenten gewinnen Prompts zu Integrationen mit Slack und Linear.",
    "Eine Vergleichsseite gäbe KI-Assistenten eine zitierbare Quelle.",
  ],
} as const;

export const DEMO_FAKE_QUESTIONS = {
  en: [
    "Which AI meeting notes app is best for remote teams?",
    "What are good Quillboard alternatives for startups?",
    "Which meeting notes tool has the best search?",
  ],
  de: [
    "Welche KI-App für Meeting-Notizen ist die beste für Remote-Teams?",
    "Was sind gute Quillboard-Alternativen für Startups?",
    "Welches Meeting-Notiz-Tool hat die beste Suche?",
  ],
} as const;

export const DEMO_FAKE_PARAGRAPHS = {
  en: [
    'Fieldnote records every meeting, writes the summary and pulls out decisions and action items. A month later you can ask "why did we move the launch?" and land on the exact moment it was decided, with the transcript snippet and who said it.',
    "Teams that switch from Quillboard usually do it for search. Transcripts are table stakes; finding the one decision in forty meetings is where the hours go. Fieldnote ranks answers by relevance and recency, so the latest decision wins.",
  ],
  de: [
    "Fieldnote zeichnet jedes Meeting auf, schreibt die Zusammenfassung und hält Entscheidungen und To-dos fest. Einen Monat später fragst du „Warum haben wir den Launch verschoben?“ und landest genau an der Stelle, an der es entschieden wurde.",
    "Teams wechseln von Quillboard meist wegen der Suche. Transkripte hat jeder; die eine Entscheidung in vierzig Meetings wiederzufinden kostet die Zeit. Fieldnote sortiert nach Relevanz und Aktualität.",
  ],
} as const;

// Plain text on purpose: the same draft is used for blog and social posts,
// and social previews show Markdown literally.
const DEMO_POST_MARKDOWN = {
  en: `Most teams don't have a meeting problem. They have a memory problem.

Decisions get made in calls, and a week later nobody can find them. Fieldnote fixes that:

- Automatic notes for every meeting on your calendar
- Decisions and action items pulled out and assigned
- Smart Search: ask "why did we move the launch?" and jump to the moment it was decided

Teams using Fieldnote cut their recurring status meetings by 40% in the first quarter.`,
  de: `Die meisten Teams haben kein Meeting-Problem. Sie haben ein Gedächtnis-Problem.

Entscheidungen fallen in Calls, und eine Woche später findet sie niemand mehr. Fieldnote löst das:

- Automatische Notizen für jedes Meeting im Kalender
- Entscheidungen und To-dos werden erkannt und zugewiesen
- Smart Search: Frag „Warum haben wir den Launch verschoben?“ und spring zur Stelle, an der es entschieden wurde

Teams mit Fieldnote haben ihre wiederkehrenden Status-Meetings im ersten Quartal um 40 % reduziert.`,
} as const;

export const DEMO_CHAT_SCENARIOS: readonly DemoChatScenario[] = [
  {
    pattern:
      /\b(write|draft|create|generate|post|blog|linkedin|tweet|thread|changelog|article|schreib|erstell|entwurf|beitrag)\b/i,
    toolPattern: /^create(Post|BlogPost|LinkedInPost|TwitterPost|Changelog)$/,
    toolArgs: (german) => ({
      title: german
        ? "Meetings ohne Gedächtnisverlust: so arbeitet Fieldnote"
        : "Meetings without memory loss: how Fieldnote works",
      slug: "meetings-without-memory-loss",
      markdown: german ? DEMO_POST_MARKDOWN.de : DEMO_POST_MARKDOWN.en,
      recommendations: german
        ? "Füge einen Screenshot von Smart Search hinzu und verlinke die Preisseite."
        : "Add a Smart Search screenshot and link to the pricing page.",
    }),
    reply: {
      en: "On it. I'll draft this in Fieldnote's voice and save it to your content.",
      de: "Mache ich. Ich schreibe den Entwurf im Fieldnote-Ton und speichere ihn in deinen Inhalten.",
    },
    followUp: {
      en: "Done! The draft is saved in **Content**. It leads with the memory problem, lists the three core features and closes with the 40% result. Want a shorter LinkedIn version too?",
      de: "Fertig! Der Entwurf liegt unter **Inhalte**. Er startet mit dem Gedächtnis-Problem, nennt die drei Kernfunktionen und endet mit dem 40-%-Ergebnis. Soll ich noch eine kürzere LinkedIn-Version schreiben?",
    },
  },
  {
    pattern:
      /\b(visib|geo|ai search|chatgpt|perplexity|claude|gemini|mention|rank|competitor|konkurren|sichtbar|erwähn)\w*/i,
    toolPattern: /^getGeo(Overview|CompetitorShare|PromptResults)$/,
    reply: {
      en: "Let me look at your AI visibility data.",
      de: "Ich schaue mir deine KI-Sichtbarkeitsdaten an.",
    },
    followUp: {
      en: `Here's the picture for the last 30 days:

- **Visibility is up.** Fieldnote is mentioned in about 6 of 10 answers, up from roughly 5 a month ago.
- **ChatGPT and OpenCode like you most**; Gemini mentions Fieldnote least often.
- **Quillboard is the main rival.** It wins prompts about Slack and Linear integrations.

The fastest win: publish a comparison page for "Quillboard alternatives" and an integrations guide. Want me to draft the comparison page?`,
      de: `So sieht es für die letzten 30 Tage aus:

- **Die Sichtbarkeit steigt.** Fieldnote wird in etwa 6 von 10 Antworten erwähnt, vor einem Monat waren es rund 5.
- **ChatGPT und OpenCode nennen euch am häufigsten**, Gemini am seltensten.
- **Quillboard ist der Hauptkonkurrent** und gewinnt Prompts zu Slack- und Linear-Integrationen.

Der schnellste Hebel: eine Vergleichsseite zu „Quillboard-Alternativen“ und ein Integrations-Guide. Soll ich die Vergleichsseite entwerfen?`,
    },
  },
  {
    pattern:
      /\b(schedule|automat|every week|weekly|daily|zeitplan|automati|wöchentlich|täglich)\w*/i,
    reply: {
      en: "You can automate this under **Automation → Schedules**: pick a source (e.g. your GitHub repo), an output like a weekly changelog, and a time. In this demo, use **Run now** on a schedule to see the result immediately.",
      de: "Das kannst du unter **Automation → Zeitpläne** automatisieren: Quelle wählen (z. B. dein GitHub-Repo), Ausgabe wie ein wöchentliches Changelog und eine Uhrzeit. In der Demo zeigt **Jetzt ausführen** das Ergebnis sofort.",
    },
  },
];

export const DEMO_CHAT_FALLBACK = {
  en: `Happy to help! In this demo I can:

- **Write content**: "Write a LinkedIn post about Smart Search"
- **Explain your AI visibility**: "How visible are we in ChatGPT?"
- **Compare competitors**: "Where does Quillboard beat us?"

Everything here runs on sample data for Fieldnote, a fictional company.`,
  de: `Gern! In dieser Demo kann ich:

- **Inhalte schreiben**: „Schreib einen LinkedIn-Post über Smart Search“
- **KI-Sichtbarkeit erklären**: „Wie sichtbar sind wir in ChatGPT?“
- **Konkurrenten vergleichen**: „Wo schlägt uns Quillboard?“

Alles hier läuft auf Beispieldaten für Fieldnote, eine fiktive Firma.`,
} as const;

/**
 * Brand analysis answer for the canned homepage below; keys missing from the
 * requested schema are dropped, the rest replace generic fake text.
 */
export const DEMO_BRAND_ANALYSIS: Readonly<Record<string, unknown>> = {
  companyDescription:
    "Fieldnote is an AI meeting notes app for product teams. It records meetings, writes the summary, pulls out decisions and action items, and makes every meeting searchable.",
  toneProfile: "Conversational",
  customTone: null,
  customInstructions: null,
  audience:
    "Product managers, engineering leads and founders at remote-first software teams of 10 to 200 people.",
  language: "English",
};

/** Stand-in homepage for brand analysis in the demo (no website is fetched). */
export const DEMO_BRAND_WEBSITE_CONTENT = `# Fieldnote: AI meeting notes your team can search

Fieldnote records your meetings, writes the summary and pulls out decisions and action items. A month later, ask "why did we move the launch?" and jump straight to the moment it was decided.

## Built for product teams
Product managers, engineering leads and founders at software companies use Fieldnote to cut status meetings and keep decisions findable.

## Features
- Automatic notes for every meeting on your calendar
- Smart Search across all meetings, in plain language
- Action items synced to Linear and Slack
- EU data residency for Business workspaces

## Pricing
Free for 10 meetings a month. Team and Business plans for growing companies.`;
