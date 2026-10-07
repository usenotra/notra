"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@notra/ui/components/ui/breadcrumb";
import { Separator } from "@notra/ui/components/ui/separator";
import { Fragment } from "react";

import { Button } from "@/components/button";
import { SidebarToggle } from "@/components/dashboard/sidebar-toggle";
import { DesignSystemSearch } from "@/components/design-system/design-system-search";
import Link from "@/components/framework/link";
import {
  DESIGN_SYSTEM_CATALOG_BY_ID,
  DESIGN_SYSTEM_CATEGORY_BY_ID,
  DESIGN_SYSTEM_PAGES,
  DESIGN_SYSTEM_PATH,
} from "@/constants/design-system-catalog";
import { usePathname } from "@/lib/navigation";

function useCrumbs(activeId: string | null): string[] {
  const pathname = usePathname();
  if (pathname !== DESIGN_SYSTEM_PATH) {
    const page = DESIGN_SYSTEM_PAGES.find((entry) => entry.href === pathname);
    return page ? ["Playgrounds", page.label] : [];
  }
  const entry = activeId ? DESIGN_SYSTEM_CATALOG_BY_ID[activeId] : null;
  if (!entry) {
    return [];
  }
  const category = DESIGN_SYSTEM_CATEGORY_BY_ID[entry.categoryId];
  const parent =
    entry.depth === 1
      ? category?.items.find((item) =>
          item.children?.some((child) => child.id === entry.id)
        )
      : null;
  // Children are named after their parent skin, so the category adds nothing.
  return [parent ? parent.label : category?.label, entry.label].filter(
    (label): label is string => Boolean(label)
  );
}

export function DesignSystemTopbar({ activeId }: { activeId: string | null }) {
  const crumbs = useCrumbs(activeId);

  return (
    <header className="bg-background/90 sticky top-0 z-20 grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b px-4 backdrop-blur-sm md:grid-cols-[minmax(0,1fr)_18rem_auto] lg:px-6">
      <div className="flex min-w-0 items-center gap-1 overflow-hidden lg:gap-2">
        <SidebarToggle className="-ml-1" />
        <Separator
          className="mx-2 h-4 self-center data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="text-foreground min-w-0 flex-nowrap gap-2 text-sm font-medium">
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbLink
                render={<Link href={DESIGN_SYSTEM_PATH}>Design system</Link>}
              />
            </BreadcrumbItem>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <Fragment key={crumb}>
                  <BreadcrumbSeparator
                    className={isLast ? undefined : "max-md:hidden"}
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem
                    className={isLast ? "min-w-0" : "shrink-0 max-md:hidden"}
                  >
                    {isLast ? (
                      <BreadcrumbPage className="truncate">
                        {crumb}
                      </BreadcrumbPage>
                    ) : (
                      <span className="text-muted-foreground">{crumb}</span>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex">
        <DesignSystemSearch />
      </div>
      <div className="hidden justify-end sm:flex">
        <Button
          render={<Link href="/" />}
          nativeButton={false}
          size="sm"
          variant="ghost"
        >
          Open dashboard
          <HugeiconsIcon icon={ArrowRight01Icon} />
        </Button>
      </div>
    </header>
  );
}
