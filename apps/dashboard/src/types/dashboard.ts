export interface OrgSelectOption {
  id: string;
  name: string;
  logo?: string | null;
}

export interface OrganizationOptionsListProps {
  organizations: OrgSelectOption[];
  selectedOrganizationId?: string | null;
  onSelect: (organizationId: string) => void;
  onCreate?: () => void;
  disabled?: boolean;
}

export interface ContentActivityEntry {
  date: string;
  count: number;
  level: number;
  drafts: number;
  published: number;
}

export interface ContentPublishingMetricsData {
  drafts: number;
  published: number;
  graph: {
    activity: ContentActivityEntry[];
  };
}
