import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@notra/ui/components/ui/breadcrumb";
import { Separator } from "@notra/ui/components/ui/separator";
import { SidebarTrigger } from "@notra/ui/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useId } from "react";

const NON_ORG_PATHS = ["/account"];

export function SiteHeader() {
  const pathname = usePathname();
  const id = useId();
  const segments = pathname.split("/").filter(Boolean);

  const isNonOrgPath = NON_ORG_PATHS.some((path) => pathname.startsWith(path));
  const breadcrumbSegments = isNonOrgPath ? segments : segments.slice(1);

  const breadcrumbs = breadcrumbSegments.flatMap((segment, index) => {
    const href = isNonOrgPath
      ? `/${segments.slice(0, index + 1).join("/")}`
      : `/${segments.slice(0, index + 2).join("/")}`;
    const isLast = index === breadcrumbSegments.length - 1;

    const item = (
      <BreadcrumbItem className="hover:underline" key={`${id}-item-${segment}`}>
        <BreadcrumbLink href={href}>
          {segment.charAt(0).toUpperCase() +
            segment.slice(1).replace(/-/g, " ")}
        </BreadcrumbLink>
      </BreadcrumbItem>
    );

    if (isLast) {
      return [item];
    }

    return [
      item,
      <BreadcrumbSeparator key={`${id}-separator-${segment}`}>
        <HugeiconsIcon icon={ArrowRight01Icon} />
      </BreadcrumbSeparator>,
    ];
  });

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-dashed transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          className="mx-2 border-border border-l border-dashed bg-transparent"
          orientation="vertical"
        />
        <Breadcrumb>
          <BreadcrumbList>{breadcrumbs}</BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
