import type { ReactNode } from "react";

export interface ShowcaseCompany {
  slug: string;
  name: string;
  domain: string;
  description: string;
  url: string;
  accentColor: string;
}

interface ShowcaseOverviewCard {
  slug: string;
  name: string;
  description: string;
  accentColor: string;
  entryCount: number;
  icon: ReactNode;
}

export interface ShowcaseOverviewGridProps {
  companies: ShowcaseOverviewCard[];
}

export interface ShowcaseEntryData {
  company: ShowcaseCompany;
  name: string;
  slug: string;
  path: string;
  entry: {
    title: string;
    description: string;
    date: string;
  };
}
