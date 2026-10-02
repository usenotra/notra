import type { ReactNode } from "react";

export type IpVersion = "v4" | "v6";

export type CrawlerCategory =
  | "training-crawler"
  | "search-index"
  | "assistant-browse";

interface CrawlerAgent {
  name: string;
  category: CrawlerCategory;
}

export interface CrawlerIpSource {
  id: string;
  vendor: string;
  iconEngine: string;
  url: string;
  docs: string;
  agents: readonly CrawlerAgent[];
}

export interface CrawlerCategoryCopy {
  label: string;
  usage: string;
  className: string;
}

export interface ParsedIp {
  version: IpVersion;
  value: bigint;
  normalized: string;
}

export interface CrawlerIpListPayload {
  creationTime?: string;
  prefixes: { ipv4Prefix?: string; ipv6Prefix?: string }[];
}

export interface CrawlerIpRange {
  prefix: string;
  version: IpVersion;
  start: bigint;
  end: bigint;
}

export interface CrawlerIpList {
  source: CrawlerIpSource;
  ranges: CrawlerIpRange[];
  updatedAt: string | null;
  ok: boolean;
}

export interface IpCheckMatch {
  sourceId: string;
  vendor: string;
  iconEngine: string;
  agents: CrawlerAgent[];
  range: string;
  listUrl: string;
  docs: string;
  listUpdatedAt: string | null;
}

export interface IpCheckEasterEgg {
  ip: string;
  iconEngine: string;
  title: string;
  body: string;
}

export interface IpCheckResult {
  ip: string;
  version: IpVersion;
  easterEgg: IpCheckEasterEgg | null;
  matches: IpCheckMatch[];
  listsChecked: number;
  listsTotal: number;
  listsUnavailable: string[];
}

export interface CrawlerListSummary {
  id: string;
  vendor: string;
  iconEngine: string;
  agents: CrawlerAgent[];
  rangeCount: number;
  updatedAt: string | null;
  url: string;
  ok: boolean;
}

export interface IpCheckSample {
  ip: string;
  label: string;
}

export type IpCheckStatus =
  | "idle"
  | "checking"
  | "done"
  | "invalid"
  | "rate-limited"
  | "error";

export interface IpCheckerToolProps {
  samples: readonly IpCheckSample[];
  initialIp?: string;
  initialResult?: IpCheckResult | null;
}

export interface IpCheckResultCardProps {
  result: IpCheckResult;
}

export interface CrawlerListsTableProps {
  lists: readonly CrawlerListSummary[];
}

export interface CrawlerAgentTagProps {
  agent: CrawlerAgent;
}

export interface AnimatedHeightProps {
  children: ReactNode;
  className?: string;
}

export interface IpCheckNoticeProps {
  message: string;
  status: IpCheckStatus;
}
