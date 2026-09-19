export const ROUTING_PROMPT = `You are a message router that classifies user messages to determine the appropriate model.

Classify messages as:
- SIMPLE: Single-step tasks, quick edits, straightforward changes, greetings, simple questions
- COMPLEX: Multi-step tasks, content creation from scratch, research, analysis, tasks requiring reasoning

Determine if tools are needed:
- Tools REQUIRED: Any editing, fetching data from connected sources, accessing skills
- Tools REQUIRED: Explicit requests to call, test, exercise, run, invoke, or trigger tools
- Tools NOT required: Answering questions, explaining concepts, conversation

Determine if the task is reasoning-heavy:
- reasoningHeavy=true: Deep analysis, long-form writing, multi-source research, architectural decisions, nuanced critique, comparative synthesis
- reasoningHeavy=false: Everyday chat, quick edits, factual lookups, straightforward content generation

Examples:
- "Hi!" → simple, no tools
- "What can you help me with?" → simple, no tools
- "Fix the typo in line 3" → simple, tools required
- "Change the title to X" → simple, tools required
- "Make this about Q1 2026" → simple, tools required
- "Make this section more engaging" → simple, tools required
- "Write a blog post about our latest release" → complex, tools required
- "Analyze the PRs and create a changelog" → complex, tools required
- "Research the commits and summarize what changed" → complex, tools required
- "Test all available tools and summarize the results" → complex, tools required
- "What's the difference between a PR and a commit?" → simple, no tools
- "Thanks!" → simple, no tools`;

const ROUTING_EXAMPLES = {
  simple_no_tools: [
    "Hi!",
    "What can you help me with?",
    "What's the difference between a PR and a commit?",
    "Thanks!",
  ],
  simple_tools: [
    "Fix the typo in line 3",
    "Change the title to X",
    "Make this about Q1 2026",
    "Make this section more engaging",
  ],
  complex_tools: [
    "Write a blog post about our latest release",
    "Analyze the PRs and create a changelog",
    "Research the commits and summarize what changed",
    "Test all available tools and summarize the results",
  ],
} as const;

/** Same rubric as ROUTING_PROMPT, split into one typed question per field. */
export const ROUTING_EVALUATION_QUESTIONS = {
  complexity: {
    type: "choice",
    instructions: {
      question: "How complex is the task in userMessage?",
      examples: ROUTING_EXAMPLES,
    },
    criteria: {
      simple:
        "Single-step task, quick edit, straightforward change, greeting, or simple question",
      complex:
        "Multi-step task, content creation from scratch, research, analysis, or a task requiring reasoning",
    },
  },
  requiresTools: {
    type: "boolean",
    instructions:
      "Does fulfilling userMessage require using tools (editing the current draft, fetching data from connected sources, accessing skills, publishing or scheduling)?",
    criteria: {
      true: "Any editing, data fetching from connected sources, skills, or explicit requests to run tools",
      false: "Answering questions, explaining concepts, or conversation",
    },
  },
  reasoningHeavy: {
    type: "boolean",
    instructions: "Is the task in userMessage reasoning-heavy?",
    criteria: {
      true: "Deep analysis, long-form writing, multi-source research, architectural decisions, nuanced critique, comparative synthesis",
      false:
        "Everyday chat, quick edits, factual lookups, straightforward content generation",
    },
  },
} as const;

export const ROUTING_EVALUATION_PRODUCT =
  "Notra, an AI content assistant that edits drafts (blog posts, changelogs, social posts) and can fetch data from connected integrations";
