import type { ComponentType, ReactNode, SVGProps } from "react";

export type SitesCodeTone =
  | "plain"
  | "muted"
  | "key"
  | "string"
  | "tag"
  | "attr";

type SitesCodeToken = readonly [SitesCodeTone, string];

export type SitesCodeLine = readonly SitesCodeToken[];

export type SitesHeroPhase = "typing" | "push" | "build" | "live";

export interface SitesHeroStory {
  phase: SitesHeroPhase;
  typed: number;
}

export interface SitesEditorFile {
  name: string;
  depth: number;
  folder?: boolean;
  active?: boolean;
}

export interface SitesFact {
  title: string;
  description: string;
}

export interface SitesSectionCopy {
  heading: string;
  description: string;
}

export interface SitesDeployment {
  commit: string;
  message: string;
  age: string;
  live: boolean;
}

export interface SitesPreviewCheck {
  name: string;
  detail: string;
}

export interface SitesDomainOption {
  label: string;
  url: string;
  detail: string;
}

export interface SitesPlatform {
  name: string;
  src?: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export interface SitesStarterFile {
  path: string;
  additions: number;
}

export interface SitesBrandSwatch {
  name: string;
  hex: string;
}

export interface SitesTrafficRow {
  agent: string;
  owner: string;
  visits: string;
}

export interface SitesStatTile {
  label: string;
  value: string;
}

export interface SitesPipelineCardProps {
  step: string;
  title: string;
  meta: ReactNode;
  children: ReactNode;
}

export interface SitesHeroPhaseProps {
  phase: SitesHeroPhase;
}

export interface SitesEditorWindowProps {
  typed: number;
  phase: SitesHeroPhase;
}

export interface SitesLogoProps {
  platform: SitesPlatform;
  className?: string;
}

export interface SitesEditorLineProps {
  number: number;
  added?: boolean;
  children?: ReactNode;
}

export interface SitesCodeTokensProps {
  line: SitesCodeLine;
}

export interface SitesPostStepProps {
  index: number;
  title: string;
  body: string;
}

export interface SitesBuildLogLine {
  label: string;
  time: string;
}
