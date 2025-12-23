import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";

export function SiteHeader() {
  const pathname = usePathname();
  const id = useId();
  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbSegments = segments.slice(1);

  const breadcrumbs = breadcrumbSegments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 2).join("/")}`;

    return (
      <BreadcrumbItem className="hover:underline" key={`${id}-${index}`}>
        <Link href={href}>
          {segment.charAt(0).toUpperCase() +
            segment.slice(1).replace(/-/g, " ")}
        </Link>
        {index < breadcrumbSegments.length - 1 && (
          <BreadcrumbSeparator key={`${id}-separator-${index}`}>
            <HugeiconsIcon icon={ArrowRight01Icon} />
          </BreadcrumbSeparator>
        )}
      </BreadcrumbItem>
    );
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
