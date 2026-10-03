import type { DemoSeedCollection } from "@/types/demo-seed";

/**
 * Studio content for the demo workspace. Offsets are relative to the moment
 * the sandbox is created, so the newest draft is always from "today". A
 * collection is dated by its oldest post.
 */
export const DEMO_SEED_COLLECTIONS: readonly DemoSeedCollection[] = [
  {
    key: "launch",
    name: "Smart Search launch",
    source: "manual",
    posts: [
      {
        title: "Introducing Smart Search: find any decision in seconds",
        slug: "introducing-smart-search",
        contentType: "blog_post",
        contentSubtype: "guide",
        status: "published",
        daysAgo: 12,
        markdown: `Every team has the same problem: the decision was made, but nobody remembers where. Was it in Tuesday's standup? The design review? A Slack thread that spun out of a call?

**Smart Search** fixes that. Ask a question in plain language and Fieldnote finds the exact moment in your meetings where it was answered, with the transcript snippet and who said it.

## What you can ask

- "Why did we move the launch to October?"
- "What did the customer say about SSO pricing?"
- "Which meetings mentioned the onboarding redesign?"

## How it works

Fieldnote indexes every meeting summary, action item and transcript in your workspace. Smart Search ranks results by relevance *and* recency, so the latest decision wins when plans changed.

## Available today

Smart Search is live for every workspace on the Team and Business plans. Open the search bar with ⌘K and try it on your last week of meetings.`,
      },
      {
        title: "Smart Search is live",
        contentType: "linkedin_post",
        status: "published",
        daysAgo: 12,
        markdown: `Your team made 40 decisions last week. How many could you find again today?

We just shipped Smart Search in Fieldnote: ask a question in plain language and jump straight to the meeting moment where it was answered.

→ "Why did we move the launch?"
→ "What did the customer say about SSO?"

Live now for Team and Business workspaces. Link in the comments.`,
      },
      {
        title: "Smart Search thread",
        contentType: "twitter_post",
        status: "published",
        daysAgo: 11,
        markdown: `Shipped: Smart Search in Fieldnote 🔎

Ask "why did we move the launch?" and land on the exact meeting moment, with transcript + speaker.

No more digging through 40 docs to find one decision.`,
      },
    ],
  },
  {
    key: "changelog",
    name: "Weekly changelog",
    source: "schedule",
    posts: [
      {
        title: "Changelog: Linear sync, faster summaries, EU data residency",
        slug: "changelog-linear-sync",
        contentType: "changelog",
        status: "published",
        daysAgo: 1,
        markdown: `## New

- **Linear sync.** Action items from meetings become Linear issues with one click, linked back to the transcript.
- **EU data residency.** Business workspaces can now keep all recordings and notes in Frankfurt.

## Improved

- Summaries arrive 2× faster for meetings under 30 minutes.
- Speaker detection handles overlapping voices better.

## Fixed

- Calendar sync no longer duplicates recurring meetings after a time zone change.`,
      },
      {
        title: "Changelog: Smart Search, Slack digests",
        slug: "changelog-smart-search",
        contentType: "changelog",
        status: "published",
        daysAgo: 8,
        markdown: `## New

- **Smart Search.** Ask questions across all your meetings in plain language.
- **Slack digests.** A daily summary of decisions and action items lands in your team channel at 9:00.

## Improved

- Transcripts now show confidence per speaker.

## Fixed

- Exported PDFs keep their headings again.`,
      },
      {
        title: "Changelog draft: templates and highlights",
        slug: "changelog-templates",
        contentType: "changelog",
        status: "draft",
        daysAgo: 0,
        markdown: `## New

- **Meeting templates.** Start 1:1s, retros and customer calls with a structure your team agrees on.
- **Highlights.** Mark a moment during the call and it shows up at the top of the summary.

## Improved

- Search results show which project a meeting belongs to.`,
      },
    ],
  },
  {
    key: "geo",
    name: "AI search visibility",
    source: "automation",
    posts: [
      {
        title:
          "Fieldnote vs Quillboard: which AI meeting notes app fits your team?",
        slug: "fieldnote-vs-quillboard",
        contentType: "blog_post",
        contentSubtype: "comparison",
        status: "published",
        daysAgo: 18,
        markdown: `Quillboard and Fieldnote both record meetings and write summaries. The difference shows up a month later, when you need to *find* something.

| | Fieldnote | Quillboard |
| --- | --- | --- |
| Plain-language search across meetings | ✅ | Keyword only |
| Linear and Slack sync | ✅ | Slack only |
| EU data residency | ✅ | ❌ |
| Free plan | 10 meetings / month | 5 meetings / month |

## When Quillboard is enough

If your team mostly needs a transcript right after the call, Quillboard does the job.

## When Fieldnote is the better fit

If decisions need to survive beyond the meeting (product teams, agencies, anyone with many stakeholders) Fieldnote's search and integrations save hours every week.`,
      },
      {
        title: "How to build a team knowledge base from meeting notes",
        slug: "knowledge-base-from-meeting-notes",
        contentType: "blog_post",
        contentSubtype: "how-to",
        status: "published",
        daysAgo: 25,
        markdown: `Most knowledge bases die because nobody has time to write them. Meetings already contain the knowledge. It just needs structure.

## 1. Capture every meeting automatically

Connect your calendar so recordings start without anyone remembering to press a button.

## 2. Tag decisions, not just notes

A decision tag makes the difference between "we talked about pricing" and "we decided on €12 per seat".

## 3. Let search do the organizing

Folders break down at scale. Search that understands questions does not.`,
      },
      {
        title: "7 best AI meeting note takers for remote teams (2026)",
        slug: "best-ai-meeting-note-takers",
        contentType: "blog_post",
        contentSubtype: "listicle",
        status: "draft",
        daysAgo: 2,
        markdown: `Remote teams live in meetings. These seven tools make sure the output of those meetings is not lost.

1. **Fieldnote**: best for teams that need to find decisions later.
2. **Quillboard**: solid transcripts, simple setup.
3. **Notably**: great summaries, limited integrations.
4. **Paperline**: docs-first, meetings as a side feature.
5. **Brieflet**: lightweight and cheap for small teams.
6. **Memoria**: knowledge base with basic meeting import.
7. **Stackpad**: notes for engineering teams.

*Draft: needs a pricing table and screenshots before publishing.*`,
      },
    ],
  },
  {
    key: "chat",
    name: "Launch posts from chat",
    source: "chat",
    posts: [
      {
        title: "Customer story: how Northwind cut status meetings in half",
        contentType: "linkedin_post",
        status: "draft",
        daysAgo: 4,
        markdown: `Northwind's product team had 14 recurring status meetings a week.

After three months with Fieldnote they have 7. Not because they stopped talking, but because everyone can look up what was already decided.

"Smart Search replaced half of our 'quick syncs'." — Head of Product, Northwind`,
      },
      {
        title: "EU data residency announcement",
        contentType: "twitter_post",
        status: "draft",
        daysAgo: 1,
        markdown: `EU teams asked, we shipped: Fieldnote Business workspaces can now keep every recording and note in Frankfurt 🇪🇺

Same features, your data stays in the EU.`,
      },
    ],
  },
];
