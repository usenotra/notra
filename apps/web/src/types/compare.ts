export type CompareCellValue = boolean | string;

export type CompareRowId =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity"
  | "aiOverviews"
  | "copilot"
  | "otherEngines"
  | "codingAgents"
  | "entryEngines"
  | "modelChoice"
  | "collection"
  | "shareOfVoice"
  | "sentiment"
  | "citations"
  | "fanout"
  | "rawAnswers"
  | "personas"
  | "conversations"
  | "languages"
  | "frequency"
  | "promptVolume"
  | "crawlerLogs"
  | "referrals"
  | "conversions"
  | "siteAudit"
  | "gaps"
  | "contentWriting"
  | "socialPosts"
  | "rescan"
  | "githubPrs"
  | "commerce"
  | "api"
  | "mcp"
  | "openSource"
  | "zdr"
  | "soc2"
  | "prompts"
  | "startingPrice";

export interface CompareRow {
  id: CompareRowId;
  label: string;
  notra: CompareCellValue;
}

export interface CompareRowGroup {
  category: string;
  description: string;
  rows: CompareRow[];
}

export interface CompareLogo {
  src: string;
  width: number;
  height: number;
}

export interface ComparePoint {
  title: string;
  description: string;
}

export interface ComparePlan {
  name: string;
  price: string;
  detail: string;
}

export interface CompareFaq {
  question: string;
  answer: string;
}

export interface CompareCompetitor {
  slug: string;
  name: string;
  website: string;
  logo: CompareLogo;
  summary: string;
  headline: string;
  headlineAccent: string;
  heroSubtitle: string;
  metaDescription: string;
  chooseNotra: string[];
  chooseCompetitor: string[];
  advantages: ComparePoint[];
  strengths: ComparePoint[];
  values: Record<CompareRowId, CompareCellValue>;
  plans: ComparePlan[];
  pricingNote: string;
  faqs: CompareFaq[];
}

export interface CompareLogoTileProps {
  logo: CompareLogo;
  name: string;
  size?: "xs" | "sm" | "lg";
}

export interface CompareLockupProps {
  competitor: CompareCompetitor;
  size?: "sm" | "lg";
}

export interface CompareCellProps {
  value: CompareCellValue;
  highlight?: boolean;
}

export interface CompareMarkProps {
  kind: "yes" | "no" | "unknown";
  highlight?: boolean;
}

export interface CompareCompetitorProps {
  competitor: CompareCompetitor;
}

export interface CompareDetailViewProps {
  competitor: CompareCompetitor;
  related: CompareCompetitor[];
}

export interface CompareIndexViewProps {
  competitors: CompareCompetitor[];
}
