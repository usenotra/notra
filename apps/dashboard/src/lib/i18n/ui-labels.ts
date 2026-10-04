import type { UiLabels } from "@notra/ui/types/ui-labels";
import { useLocale, useTranslations } from "use-intl";

export function useUiLabelsTranslations(): UiLabels {
  const t = useTranslations("ui");
  const tCommon = useTranslations("common");
  const tTable = useTranslations("shared.table");
  const locale = useLocale();

  return {
    locale,
    close: tCommon("actions.close"),
    copy: tCommon("actions.copy"),
    copied: tCommon("actions.copied"),
    more: tCommon("labels.more"),
    completed: t("completed"),
    incomplete: t("incomplete"),
    remove: tCommon("actions.remove"),
    previous: tCommon("actions.previous"),
    next: tCommon("actions.next"),
    pagination: t("pagination"),
    goToPreviousPage: t("goToPreviousPage"),
    goToNextPage: t("goToNextPage"),
    morePages: t("morePages"),
    paginationRange: (start, end, total) =>
      t("paginationRange", { start, end, total }),
    paginationRangeOpen: (start, end) =>
      t("paginationRangeOpen", { start, end }),
    pageOf: (page, total) => t("pageOf", { page, total }),
    pageNumber: (page) => t("pageNumber", { page }),
    showRows: (count) => t("showRows", { count }),
    rowsPerPage: t("rowsPerPage"),
    toggleSidebar: t("toggleSidebar"),
    sidebarTitle: t("sidebarTitle"),
    sidebarDescription: t("sidebarDescription"),
    previousSlide: t("previousSlide"),
    nextSlide: t("nextSlide"),
    scrollToEnd: t("scrollToEnd"),
    scrollToStart: t("scrollToStart"),
    conversationTurns: t("conversationTurns"),
    previousTurn: t("previousTurn"),
    nextTurn: t("nextTurn"),
    commandPaletteTitle: tCommon("labels.commandPalette"),
    commandPaletteDescription: t("commandPaletteDescription"),
    chooseOption: t("chooseOption"),
    permissions: tCommon("labels.permissions"),
    catalog: t("catalog"),
    showPassword: tCommon("labels.showPassword"),
    hidePassword: tCommon("labels.hidePassword"),
    previousBranch: t("previousBranch"),
    nextBranch: t("nextBranch"),
    table: tCommon("labels.table"),
    noData: tCommon("labels.noData"),
    selectAllRows: tTable("selectAllRows"),
    selectRow: (row) => tTable("selectRow", { row }),
    resizeColumn: (column) => tTable("resizeColumn", { column }),
    copyTableAsMarkdown: t("copyTableAsMarkdown"),
    downloadTable: t("downloadTable"),
    viewTableFullscreen: t("viewTableFullscreen"),
    tableFormatCsv: t("tableFormatCsv"),
    tableFormatMarkdown: tCommon("labels.markdown"),
    tableFormatPlain: t("tableFormatPlain"),
    image: tCommon("labels.image"),
    attachment: tCommon("labels.attachment"),
    removeAttachment: t("removeAttachment"),
    expandImage: t("expandImage"),
    minimizeImage: t("minimizeImage"),
  };
}
