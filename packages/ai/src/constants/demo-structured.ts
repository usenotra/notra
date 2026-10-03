import { DEMO_COMPETITORS } from "@notra/ai/constants/demo-context-dev";

/**
 * Canned answers for structured AI calls the generic schema faker can't
 * satisfy: they carry rules JSON Schema doesn't express (two-word job titles,
 * prompts that must not name the brand) or need content that reads as real.
 */

export const DEMO_PERSONAS = [
  {
    name: "Async Champion",
    role: "Engineering Manager",
    company: "40-person remote SaaS team",
    summary:
      "Runs a distributed engineering team and wants fewer status meetings without losing context.",
    searchStyle:
      "Asks detailed comparison questions and checks integrations before trying anything.",
    goals: [
      "Cut recurring status meetings",
      "Keep decisions findable for new hires",
    ],
    painPoints: [
      "Decisions get lost in call recordings",
      "Notes live in five different tools",
    ],
    currentStack: ["Slack", "Linear", "Google Meet"],
    buyingTriggers: [
      "A missed decision caused rework",
      "The team crossed three time zones",
    ],
    objections: ["Worried about recording consent", "Another tool to adopt"],
    conversationPrompts: [
      "What is the best AI meeting notes app for remote engineering teams?",
      "Which meeting notes tools integrate with Linear and Slack?",
      "How do teams make past meeting decisions searchable?",
    ],
    memories: [
      { kind: "background", content: "Manages 12 engineers across Europe." },
      { kind: "experience", content: "Tried a transcription bot last year." },
      { kind: "preference", content: "Prefers tools with a free tier." },
      { kind: "constraint", content: "Needs EU data residency." },
      { kind: "experience", content: "Runs weekly async standups in Slack." },
      { kind: "preference", content: "Wants summaries in under a minute." },
    ],
  },
  {
    name: "Busy Founder",
    role: "Founder",
    company: "Seed-stage B2B startup",
    summary:
      "Spends most of the day in customer and investor calls and needs crisp follow-ups.",
    searchStyle: "Short, practical questions on mobile between meetings.",
    goals: ["Send follow-ups within an hour", "Remember every customer ask"],
    painPoints: ["Forgets promises made on calls", "No time to write notes"],
    currentStack: ["Zoom", "Notion", "HubSpot"],
    buyingTriggers: [
      "Lost a deal over a missed follow-up",
      "Hired a first salesperson",
    ],
    objections: ["Price per seat", "Setup time"],
    conversationPrompts: [
      "Which AI note taker writes the best meeting follow-up emails?",
      "Is there a meeting assistant that works with Zoom and Notion?",
      "What is a cheap AI meeting notes tool for a small startup?",
    ],
    memories: [
      { kind: "background", content: "Co-founded the company two years ago." },
      { kind: "experience", content: "Takes about 25 calls a week." },
      { kind: "preference", content: "Likes tools that need no setup." },
      { kind: "constraint", content: "Budget under 20 dollars a month." },
      { kind: "experience", content: "Used handwritten notes until now." },
      { kind: "preference", content: "Reads everything on the phone." },
    ],
  },
  {
    name: "Process Owner",
    role: "Product Lead",
    company: "Mid-size product company",
    summary:
      "Owns planning rituals and wants a single source of truth for product decisions.",
    searchStyle: "Researches thoroughly and shares shortlists with the team.",
    goals: ["One place for decisions", "Faster planning cycles"],
    painPoints: ["Context scattered across docs", "Repeated discussions"],
    currentStack: ["Jira", "Confluence", "Microsoft Teams"],
    buyingTriggers: ["Quarterly planning went badly", "New VP asked for docs"],
    objections: ["Change management", "Security review"],
    conversationPrompts: [
      "How do product teams keep a record of decisions made in meetings?",
      "What are the best alternatives to manual meeting minutes?",
      "Which AI meeting tools work with Microsoft Teams and Jira?",
    ],
    memories: [
      { kind: "background", content: "Leads three product squads." },
      { kind: "experience", content: "Maintains a decision log by hand." },
      { kind: "preference", content: "Values clear audit trails." },
      { kind: "constraint", content: "Needs SSO and SOC 2." },
      { kind: "experience", content: "Ran a failed wiki migration." },
      { kind: "preference", content: "Prefers structured templates." },
    ],
  },
  {
    name: "Security Gatekeeper",
    role: "IT Manager",
    company: "Regulated fintech",
    summary:
      "Approves every new tool and cares about data handling before features.",
    searchStyle: "Searches for compliance terms and vendor security pages.",
    goals: ["Approve tools quickly but safely", "Keep data in the EU"],
    painPoints: ["Shadow IT recording tools", "Unclear data retention"],
    currentStack: ["Okta", "Google Workspace", "Vanta"],
    buyingTriggers: ["Audit finding on meeting data", "Team requests a tool"],
    objections: ["Vendor lock-in", "Where recordings are stored"],
    conversationPrompts: [
      "Which AI meeting notes apps offer EU data residency?",
      "Are AI note takers GDPR compliant?",
      "What should IT check before approving a meeting recorder?",
    ],
    memories: [
      { kind: "background", content: "Runs IT for 300 employees." },
      { kind: "experience", content: "Blocked two recording bots last year." },
      { kind: "preference", content: "Wants admin controls and SSO." },
      { kind: "constraint", content: "Data must stay in the EU." },
      { kind: "experience", content: "Completed a vendor review in a week." },
      { kind: "preference", content: "Reads security docs first." },
    ],
  },
  {
    name: "Customer Voice",
    role: "Success Lead",
    company: "Growing customer success team",
    summary:
      "Runs many customer calls and wants feedback to reach the product team.",
    searchStyle: "Looks for workflows and templates other teams share.",
    goals: ["Share customer feedback weekly", "Shorter call prep"],
    painPoints: ["Feedback stuck in call notes", "Manual CRM updates"],
    currentStack: ["Gong", "Salesforce", "Slack"],
    buyingTriggers: ["Churn review found missed signals", "Team doubled"],
    objections: ["Overlap with existing call recorder", "Training time"],
    conversationPrompts: [
      "How can customer success teams turn call notes into product feedback?",
      "Which meeting notes tool syncs action items to Salesforce?",
      "What is a good template for customer call notes?",
    ],
    memories: [
      { kind: "background", content: "Leads a team of six CSMs." },
      { kind: "experience", content: "Copies call notes into the CRM daily." },
      { kind: "preference", content: "Wants searchable customer quotes." },
      { kind: "constraint", content: "Customers must consent to recording." },
      { kind: "experience", content: "Shares a weekly feedback digest." },
      { kind: "preference", content: "Likes Slack-first workflows." },
    ],
  },
] as const;

/** Multi-turn conversations; prompts never name the brand. */
export const DEMO_CONVERSATIONS = [
  {
    name: "Choosing a meeting notes tool",
    steps: [
      "What are the best AI meeting notes apps for remote teams?",
      "Which of those work well with Slack and Linear?",
      "Which one is the best value for a 20-person team?",
    ],
  },
  {
    name: "Async standups",
    steps: [
      "How do remote teams run async standups?",
      "Which tools can summarize standup notes automatically?",
      "Is there a tool that also tracks decisions from meetings?",
    ],
  },
  {
    name: "Security review",
    steps: [
      "Are AI meeting recorders safe for company data?",
      "Which meeting notes apps offer EU data residency?",
      "What do I need to check before approving one?",
    ],
  },
  {
    name: "Searching past meetings",
    steps: [
      "How can I find decisions from old meetings quickly?",
      "Which apps let you search across all meeting transcripts?",
      "Do any of them link answers back to the moment in the call?",
    ],
  },
  {
    name: "Follow-up emails",
    steps: [
      "Which AI tools write follow-up emails after sales calls?",
      "Can they pull action items into a CRM?",
      "Which one is easiest to set up for a small team?",
    ],
  },
] as const;

/** Questions a new project starts tracking; never names the brand. */
export const DEMO_DISCOVERY_PROMPTS = [
  {
    title: "Best tools",
    prompt: "What are the best tools for teams like ours in 2026?",
  },
  {
    title: "Alternatives",
    prompt: "What are good alternatives to the market leader?",
  },
  {
    title: "Integrations",
    prompt: "Which tools in this category integrate with Slack?",
  },
  {
    title: "Pricing",
    prompt: "Which tools in this category have a free plan?",
  },
  {
    title: "Small teams",
    prompt: "What is the best option for a small startup team?",
  },
  {
    title: "Security",
    prompt: "Which vendors in this category are GDPR compliant?",
  },
  {
    title: "Getting started",
    prompt: "How do teams usually get started with tools like this?",
  },
] as const;

export const DEMO_DISCOVERY_COMPETITORS = DEMO_COMPETITORS.map(
  ({ name, domain }) => ({ name, domain })
);

/** Sentiment themes; claims cite verbatim sentences from the sampled answers. */
export const DEMO_SENTIMENT_THEMES = [
  {
    title: "Search across meetings",
    polarity: "positive",
    statement: "Answers praise finding past decisions quickly.",
  },
  {
    title: "Clear, fast summaries",
    polarity: "positive",
    statement: "Engines describe the summaries as concise and useful.",
  },
  {
    title: "Fewer integrations than rivals",
    polarity: "negative",
    statement: "Some answers say rivals connect to more tools.",
  },
] as const;
