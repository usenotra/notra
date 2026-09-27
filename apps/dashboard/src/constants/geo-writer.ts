import {
  BookOpen01Icon,
  BubbleChatQuestionIcon,
  GitCompareIcon,
  GlobalIcon,
  Layers01Icon,
  LeftToRightListNumberIcon,
  PaintBrush01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";

export const GEO_WRITE_CONTENT_SUBTYPES = [
  {
    id: "guide" as const,
    icon: BookOpen01Icon,
    iconClass: "text-muted-foreground",
  },
  {
    id: "listicle" as const,
    icon: LeftToRightListNumberIcon,
    iconClass: "text-muted-foreground",
  },
  {
    id: "comparison" as const,
    icon: GitCompareIcon,
    iconClass: "text-muted-foreground",
  },
];

export const GEO_WRITE_DIALOG_SECTIONS = [
  {
    id: "prompt" as const,
    required: true,
    icon: BubbleChatQuestionIcon,
  },
  {
    id: "type" as const,
    required: true,
    icon: Layers01Icon,
  },
  {
    id: "brand" as const,
    required: false,
    icon: PaintBrush01Icon,
  },
  {
    id: "sitemap" as const,
    required: false,
    icon: GlobalIcon,
  },
  {
    id: "competitors" as const,
    required: false,
    icon: UserMultiple02Icon,
  },
];

export const GEO_WRITE_FORMAT_RULES = [
  {
    id: "comparison" as const,
    pattern:
      /\b(vs\.?|versus|compare|comparison|difference between|better than|alternatives?)\b/i,
  },
  {
    id: "listicle" as const,
    pattern:
      /\b(best|top \d*|list of|tools?|platforms?|software|apps?|options|examples|companies|providers|vendors)\b/i,
  },
] as const;
