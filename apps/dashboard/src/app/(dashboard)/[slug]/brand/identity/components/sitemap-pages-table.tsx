"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@notra/ui/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { getPageNumbers } from "@notra/ui/lib/get-page-numbers";
import { parseAsInteger, useQueryState } from "nuqs";
import { useState } from "react";

import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useSitemapPages } from "@/lib/hooks/use-brand-sitemaps";
import {
  formatTextRatio,
  formatWordCount,
  getStatusCodeClassName,
} from "@/lib/sitemap/display";
import {
  formatRelativeCrawlTime,
  getSafeHttpUrl,
} from "@/lib/sitemap/sitemap-url";
import { cn } from "@/lib/utils";
import type {
  SitemapPage,
  SitemapPageCategory,
  SitemapPagesTableProps,
} from "@/types/hooks/brand-sitemaps";

import {
  PAGE_FILTER_TABS,
  SITEMAP_PAGES_PER_PAGE,
} from "../constants/sitemap-ui";

export function SitemapPagesTable({
  children,
  sitemapId,
  organizationId,
  voiceId,
}: SitemapPagesTableProps) {
  const { data, isPending } = useSitemapPages(
    organizationId,
    voiceId,
    sitemapId
  );
  const [activeFilter, setActiveFilter] =
    useState<SitemapPageCategory>("crawled");
  const [search, setSearch] = useState("");
  const [rawPage, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: true })
  );

  const handleFilterChange = (filter: SitemapPageCategory) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const pages = data?.pages ?? [];

  const countsByCategory = (() => {
    const counts: Record<SitemapPageCategory, number> = {
      crawled: 0,
      redirect: 0,
      queued: 0,
      failed: 0,
    };
    for (const page of pages) {
      counts[page.category] += 1;
    }
    return counts;
  })();

  const visiblePages = (() => {
    const query = search.trim().toLowerCase();
    return pages.filter((page) => {
      if (page.category !== activeFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        page.url.toLowerCase().includes(query) ||
        (page.title?.toLowerCase().includes(query) ?? false)
      );
    });
  })();

  const totalPages = Math.max(
    1,
    Math.ceil(visiblePages.length / SITEMAP_PAGES_PER_PAGE)
  );
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);
  const paginatedPages = visiblePages.slice(
    (currentPage - 1) * SITEMAP_PAGES_PER_PAGE,
    currentPage * SITEMAP_PAGES_PER_PAGE
  );

  const filter = (
    <Tabs
      value={activeFilter}
      onValueChange={(value) => {
        const tab = PAGE_FILTER_TABS.find((item) => item.value === value);
        if (tab) {
          handleFilterChange(tab.value);
        }
      }}
    >
      <TabsList aria-label="Sitemap page status">
        {PAGE_FILTER_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label} ({countsByCategory[tab.value]})
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  return (
    <section aria-label="Sitemap pages" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {children}
        <div className="flex flex-wrap items-center gap-3">
          <InputGroup className="w-full sm:w-56">
            <InputGroupAddon>
              <HugeiconsIcon
                className="text-muted-foreground size-4"
                icon={Search01Icon}
              />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search sitemap URLs"
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search URLs…"
              value={search}
            />
          </InputGroup>
          {filter}
        </div>
      </div>

      <Table
        columns={columns}
        data={paginatedPages}
        emptyState={
          search.trim()
            ? "No URLs match your search."
            : "No URLs in this view yet."
        }
        getRowId={(page) => page.id}
        height={440}
        loading={isPending}
        rowHeight={TABLE_ROW_HEIGHT}
      />

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className={cn(
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
                onClick={(event) => {
                  event.preventDefault();
                  setPage(Math.max(1, currentPage - 1));
                }}
              />
            </PaginationItem>
            {getPageNumbers(currentPage, totalPages).map(
              (pageNumber, index, pages) =>
                pageNumber === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${pages[index - 1]}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      isActive={pageNumber === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
            )}
            <PaginationItem>
              <PaginationNext
                className={cn(
                  currentPage === totalPages && "pointer-events-none opacity-50"
                )}
                onClick={(event) => {
                  event.preventDefault();
                  setPage(Math.min(totalPages, currentPage + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </section>
  );
}

function PageUrlCell({ page }: { page: SitemapPage }) {
  const safeUrl = getSafeHttpUrl(page.url);

  return (
    <div>
      <div className="min-w-0">
        {safeUrl ? (
          <a
            className="text-foreground block truncate text-sm font-medium hover:underline"
            href={safeUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {page.path}
          </a>
        ) : (
          <span className="block truncate text-sm font-medium">
            {page.path}
          </span>
        )}
        <p className="text-muted-foreground truncate text-xs">
          {page.category === "redirect" && page.redirectTarget
            ? `→ ${page.redirectTarget}`
            : (page.title ?? page.url)}
        </p>
      </div>
    </div>
  );
}

const columns: TableColumn<SitemapPage>[] = [
  {
    key: "url",
    header: "URL",
    width: "1fr",
    minWidth: "16rem",
    cell: (page) => <PageUrlCell page={page} />,
  },
  {
    key: "statusCode",
    header: "Status",
    width: "6rem",
    cell: (page) =>
      page.statusCode === null ? (
        <Badge variant="secondary">Queued</Badge>
      ) : (
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            getStatusCodeClassName(page.statusCode)
          )}
        >
          {page.statusCode}
        </span>
      ),
  },
  {
    key: "content",
    header: "Content",
    width: "10rem",
    cell: (page) => {
      const textRatio = formatTextRatio(page.textRatio);
      return (
        <>
          <div className="text-sm">{formatWordCount(page.wordCount)}</div>
          {textRatio ? (
            <div className="text-muted-foreground text-xs">{textRatio}</div>
          ) : null}
        </>
      );
    },
  },
  {
    key: "links",
    header: "Links",
    width: "9rem",
    cell: (page) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {page.internalLinks === null && page.externalLinks === null
          ? "—"
          : `${page.internalLinks ?? 0} int / ${page.externalLinks ?? 0} ext`}
      </span>
    ),
  },
  {
    key: "crawledAt",
    header: "Crawled",
    width: "9rem",
    cell: (page) => (
      <span className="text-muted-foreground text-sm">
        {formatRelativeCrawlTime(page.crawledAt)}
      </span>
    ),
  },
];
