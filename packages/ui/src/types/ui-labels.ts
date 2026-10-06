import type { ReactNode } from "react";

export interface UiLabels {
  locale?: string;
  close: string;
  cancel: string;
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
  paginationRangeOpen: (start: string, end: string) => string;
  pageOf: (page: string, total: string) => string;
  pageNumber: (page: string) => string;
  showRows: (count: string) => string;
  rowsPerPage: string;
  toggleSidebar: string;
  sidebarTitle: string;
  sidebarDescription: string;
  previousSlide: string;
  nextSlide: string;
  scrollToEnd: string;
  scrollToStart: string;
  conversationTurns: string;
  previousTurn: string;
  nextTurn: string;
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
  noData: string;
  selectAllRows: string;
  selectRow: (row: string) => string;
  resizeColumn: (column: string) => string;
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
  composerEdit: (label: string) => string;
  composerRemove: (label: string) => string;
  composerSteer: (label: string) => string;
  composerPreview: (label: string) => string;
  moreInfo: string;
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
