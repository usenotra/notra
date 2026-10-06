import type {
  GranolaFeature,
  GranolaHeadline,
  GranolaNoteLine,
} from "@/types/granola-integration";
import type { IntegrationTool } from "@/types/integrations";
import { APP_URL } from "@/utils/urls";

export const GRANOLA_HEADLINE: GranolaHeadline = {
  pre: "Turn",
  highlight: "meeting notes",
  secondLinePre: "into",
  accent: "customer stories.",
};

export const GRANOLA_HERO_SUBHEAD =
  "Notra reads the Granola notes you share. It turns summaries, transcripts and attendee lists into customer stories, changelog entries and posts in your brand voice.";

export const GRANOLA_CONNECT_LABEL = "Connect Granola";

export const GRANOLA_CONNECT_HREF = `${APP_URL}/integrations/granola`;

export const GRANOLA_MARKETPLACE_LABEL = "View in marketplace";

export const GRANOLA_MARKETPLACE_HREF = "/integrations";

export const GRANOLA_NOTE_TITLE = "Mintcloud <> Notra";

export const GRANOLA_NOTE_CHIPS = [
  "✦ Enhanced",
  "Yesterday · 3",
  "Customer calls",
];

export const GRANOLA_NOTE_HEADING = "Rollout results";

export const GRANOLA_NOTE_LINES: GranolaNoteLine[] = [
  {
    text: "Onboarding went from two weeks to a single afternoon after switching",
  },
  { text: '"The scheduler basically sells itself" (Priya, Head of Ops)' },
  { text: "Happy to be quoted in a customer story", nested: true },
];

export const GRANOLA_NOTE_INPUT_PLACEHOLDER = "Ask anything";

export const GRANOLA_DRAFT_TITLE = "Customer story draft";

export const GRANOLA_DRAFT_ACTION_LABEL = "Publish";

export const GRANOLA_DRAFT_HEADLINE = "How Mintcloud onboards in an afternoon";

export const GRANOLA_DRAFT_BODY =
  'Mintcloud\'s ops team used to spend two weeks on rollout. Since switching, onboarding takes a single afternoon. "The scheduler basically sells itself," says Priya, their Head of Ops.';

export const GRANOLA_DRAFT_META = "Drafted from Mintcloud <> Notra";

export const GRANOLA_FEATURES: GranolaFeature[] = [
  {
    title: "Reads the folders you pick",
    description:
      "Point Notra at your customer-call folders in Granola. It can't see your other meetings.",
  },
  {
    title: "Quotes the customer",
    description:
      "Notra writes the story in your brand voice and uses the customer's own words from the call.",
  },
  {
    title: "Publishes where you announce",
    description:
      "Send the draft to your changelog, blog, X or LinkedIn from Notra.",
  },
];

export const GRANOLA_TOOLS: IntegrationTool[] = [
  {
    name: "get_granola_folders",
    title: null,
    description: "List the folders in your Granola workspace.",
  },
  {
    name: "get_granola_notes",
    title: null,
    description: "List meeting notes with their summaries and attendees.",
  },
  {
    name: "get_granola_note",
    title: null,
    description:
      "Get one note with its summary and, if needed, the transcript.",
  },
];

export const GRANOLA_CTA_HEADING = "Publish stories from your customer calls";

export const GRANOLA_CTA_SUBCOPY =
  "Connect Granola and turn this week's customer calls into stories ready to publish.";

export const GRANOLA_CTA_PRIMARY_LABEL = "Start for free";

export const GRANOLA_CTA_SECONDARY_LABEL = "Book a Call";

export const GRANOLA_CTA_CONTACT_HREF = "/contact";

export const GRANOLA_SIGNUP_SOURCE = "granola_integration";
