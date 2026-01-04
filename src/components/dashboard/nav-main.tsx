"use client";

import {
  AnalyticsUpIcon,
  CorporateIcon,
  NoteIcon,
  PlugIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavMainCategory = "none" | "brand" | "utility";

interface NavMainItem {
  link: string;
  icon: IconSvgElement;
  label: string;
  category: NavMainCategory;
}

const categoryLabels: Record<Exclude<NavMainCategory, "none">, string> = {
  brand: "Brand",
  utility: "Utility",
};

const navMainItems: NavMainItem[] = [
  {
    link: "/integrations",
    icon: PlugIcon,
    label: "Integrations",
    category: "none",
  },
  {
    link: "/content",
    icon: NoteIcon,
    label: "Content",
    category: "none",
  },
  {
    link: "/brand/identity",
    icon: CorporateIcon,
    label: "Identity",
    category: "brand",
  },
  {
    link: "/brand/logs",
    icon: AnalyticsUpIcon,
    label: "Logs",
    category: "brand",
  },
];

function NavGroup({
  items,
  slug,
  label,
}: {
  items: NavMainItem[];
  slug: string;
  label?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.link}>
              <SidebarMenuButton
                render={
                  <Link href={`/${slug}${item.link}`}>
                    <HugeiconsIcon icon={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function NavMain() {
  const { activeOrganization } = useOrganizationsContext();

  if (!activeOrganization?.slug) {
    return null;
  }

  const slug = activeOrganization.slug;

  const uncategorized = navMainItems.filter((item) => item.category === "none");
  const categories = Object.keys(categoryLabels) as Exclude<
    NavMainCategory,
    "none"
  >[];

  return (
    <>
      <NavGroup items={uncategorized} slug={slug} />
      {categories.map((category) => {
        const items = navMainItems.filter((item) => item.category === category);
        return (
          <NavGroup
            items={items}
            key={category}
            label={categoryLabels[category]}
            slug={slug}
          />
        );
      })}
    </>
  );
}
