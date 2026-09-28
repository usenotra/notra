export const OSS_PROGRAM_TITLE = "Notra for Open Source";

export const OSS_PROGRAM_SUBTITLE =
  "Notra is free for open source builders. Get the Growth plan at no cost in exchange for honest feedback, and let your shipped work do the marketing.";

export const OSS_PROGRAM_BENEFITS_HEADING = "What you get";

export const OSS_PROGRAM_BENEFITS_SUBCOPY =
  "Accepted projects use Notra free. The only ask is that you tell us what works and what doesn't.";

export const OSS_PROGRAM_BENEFITS = [
  {
    label: "Free Notra Growth plan",
    detail:
      "Full access to the $250/mo Growth plan for as long as you're in the program. No credit card needed.",
  },
  {
    label: "Content from your shipped work",
    detail:
      "Turn commits, PRs, and releases into changelogs, launch posts, and social updates.",
  },
  {
    label: "Marketing assets in your voice",
    detail:
      "Generate launch visuals and copy that sound like your project, not a template.",
  },
  {
    label: "A direct line to the team",
    detail: "Shape the roadmap with your feedback. That's the whole trade.",
  },
] as const;

export const OSS_PROGRAM_OSI_LICENSES_URL = "https://opensource.org/licenses";

export const OSS_PROGRAM_ELIGIBILITY_HEADING = "Who's eligible";

export const OSS_PROGRAM_ELIGIBILITY = [
  { id: "public", content: "Your project is publicly available on GitHub." },
  {
    id: "license",
    content: `It's licensed under an [OSI-approved open source license](${OSS_PROGRAM_OSI_LICENSES_URL}).`,
  },
  {
    id: "useful",
    content:
      "You're building something genuinely useful that benefits from content and marketing.",
  },
  {
    id: "maintainer",
    content: "You're an owner or maintainer of the repository.",
  },
  {
    id: "active",
    content: "The project shows active development and community engagement.",
  },
] as const;

export const OSS_PROGRAM_STATUS_HEADING = "Applications are closed";

export const OSS_PROGRAM_STATUS_SUBCOPY =
  "We're not accepting new applications at this time. Check back soon, we'll reopen the program once we have room for more projects.";
