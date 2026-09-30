import { DEMO_COMPANY_NAME, DEMO_COMPANY_WEBSITE } from "@/constants/demo";

export const DEMO_SEED_BRAND = {
  name: "Fieldnote",
  websiteUrl: DEMO_COMPANY_WEBSITE,
  companyName: DEMO_COMPANY_NAME,
  companyDescription:
    "Fieldnote is an AI meeting notes app for product teams. It records calls, writes summaries and action items, and makes every decision searchable in plain language.",
  toneProfile: "Conversational",
  customTone:
    "Clear and friendly. Short sentences, concrete examples, no buzzwords. We explain what changed and why it matters.",
  customInstructions:
    "Always mention the concrete outcome for the team. Never promise features that are not shipped.",
  audience:
    "Product managers, engineering leads and founders at 10–200 person software companies.",
  language: "English",
} as const;

export const DEMO_SEED_BRAND_COLORS = [
  {
    role: "primary",
    name: "Field green",
    lightValue: "#1f7a5c",
    darkValue: "#3fb58c",
    usage: "Buttons, links and highlights.",
  },
  {
    role: "secondary",
    name: "Paper",
    lightValue: "#f6f3ec",
    darkValue: "#1c1b18",
    usage: "Page and card backgrounds.",
  },
  {
    role: "accent",
    name: "Marker yellow",
    lightValue: "#f2c14e",
    darkValue: "#e0b13f",
    usage: "Highlights inside transcripts.",
  },
  {
    role: "foreground",
    name: "Ink",
    lightValue: "#1a1d1f",
    darkValue: "#f1f1ef",
    usage: "Body text.",
  },
] as const;

export const DEMO_SEED_BRAND_FONTS = [
  { role: "heading", family: "Inter Display", weight: "600" },
  { role: "body", family: "Inter", weight: "400" },
] as const;
