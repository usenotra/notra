export interface AreaPages {
  area: "blog" | "changelog";
  title: string;
  description?: string;
  indexPath: string;
  entries: Array<{
    path: string;
    title: string;
    description?: string;
    summary?: string;
    date: string;
    updated?: string;
    authors?: string[];
    version?: string;
    tags: string[];
    indexable: boolean;
  }>;
}

export type AreaPageEntry = AreaPages["entries"][number];

export interface LlmsTxtParams {
  name: string;
  description?: string;
  areas: AreaPages[];
  origin: string;
  fullTextPath: string;
  instructions: readonly string[];
}

export interface WriteAgentFilesParams {
  outDir: string;
  origin: string;
  siteName: string;
  siteDescription?: string;
  areas: AreaPages[];
  pageHtml: ReadonlyMap<string, string>;
  instructions: readonly string[];
}
