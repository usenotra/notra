export interface SidebarUpgradeCopyInput {
  hasNoPlan: boolean;
  isLoading: boolean;
  planName: string | undefined;
  showTrial: boolean;
}

export interface SidebarUpgradeCopy {
  buttonLabel: string;
  description: string;
  heading: string;
}
