import type { ReactNode } from "react";

export interface UiLabels {
  locale?: string;
  close: string;
  copy: string;
  copied: string;
  more: string;
  completed: string;
  incomplete: string;
  remove: string;
  previous: string;
  next: string;
  pagination: string;
  goToPreviousPage: string;
  goToNextPage: string;
  morePages: string;
  paginationRange: (start: string, end: string, total: string) => string;
  toggleSidebar: string;
  sidebarTitle: string;
  sidebarDescription: string;
  previousSlide: string;
  nextSlide: string;
  scrollToEnd: string;
  scrollToStart: string;
  commandPaletteTitle: string;
  commandPaletteDescription: string;
  chooseOption: string;
  permissions: string;
  catalog: string;
  showPassword: string;
  hidePassword: string;
  previousBranch: string;
  nextBranch: string;
  table: string;
  copyTableAsMarkdown: string;
  downloadTable: string;
  viewTableFullscreen: string;
  tableFormatCsv: string;
  tableFormatMarkdown: string;
  tableFormatPlain: string;
  image: string;
  attachment: string;
  removeAttachment: string;
  expandImage: string;
  minimizeImage: string;
}

export type UiLabelKey = {
  [Key in keyof UiLabels]-?: UiLabels[Key] extends string ? Key : never;
}[keyof UiLabels];

export interface UiLabelsProviderProps {
  labels?: Partial<UiLabels>;
  children: ReactNode;
}

export interface UiLabelProps {
  name: UiLabelKey;
}
