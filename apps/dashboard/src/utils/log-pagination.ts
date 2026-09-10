import type { LogPageOptions } from "@/types/logs/data-table";
import type { Log } from "@/types/webhooks/webhooks";

export function getLogPage(logs: readonly Log[], options: LogPageOptions) {
  const search = options.search.trim().toLowerCase();
  const filtered = logs.filter(
    (log) =>
      (options.source === "all" || log.integrationType === options.source) &&
      (options.status === "all" || log.status === options.status) &&
      (!search ||
        log.title.toLowerCase().includes(search) ||
        log.errorMessage?.toLowerCase().includes(search))
  );
  const sort = options.sort;
  if (sort) {
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sort.key === "createdAt") {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sort.key === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sort.key === "status") {
        comparison = a.status.localeCompare(b.status);
      } else if (sort.key === "integrationType") {
        comparison = a.integrationType.localeCompare(b.integrationType);
      }
      return (
        (sort.direction === "asc" ? comparison : -comparison) ||
        a.id.localeCompare(b.id)
      );
    });
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / options.pageSize));
  const page = Math.min(totalPages, Math.max(1, options.page));
  return {
    logs: filtered.slice(
      (page - 1) * options.pageSize,
      page * options.pageSize
    ),
    page,
    totalPages,
    totalCount: filtered.length,
  };
}
