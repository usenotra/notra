"use client";
import {
  AnalyticsUpIcon,
  Calendar03Icon,
  CorporateIcon,
  Home01Icon,
  NoteIcon,
  Notification03Icon,
  PlugIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@notra/ui/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { useOrganizationsContext } from "@/components/providers/organization-provider";

type NavMainCategory = "none" | "workspace" | "schedules" | "utility";

interface NavMainItem {
  link: string;
  icon: IconSvgElement;
  label: string;
  category: NavMainCategory;
}

const categoryLabels: Record<Exclude<NavMainCategory, "none">, string> = {
  workspace: "Workspace",
  schedules: "Schedules",
  utility: "Utility",
};

const navMainItems: NavMainItem[] = [
  {
    link: "",
    icon: Home01Icon,
    label: "Home",
    category: "none",
  },
  {
    link: "/content",
    icon: NoteIcon,
    label: "Content",
    category: "workspace",
  },
  {
    link: "/brand/identity",
    icon: CorporateIcon,
    label: "Identity",
    category: "workspace",
  },
  {
    link: "/automation/schedule",
    icon: Calendar03Icon,
    label: "Schedules",
    category: "schedules",
  },
  {
    link: "/automation/events",
    icon: Notification03Icon,
    label: "Events",
    category: "schedules",
  },
  {
    link: "/integrations",
    icon: PlugIcon,
    label: "Integrations",
    category: "utility",
  },
  {
    link: "/logs",
    icon: AnalyticsUpIcon,
    label: "Logs",
    category: "utility",
  },
];

const itemsByCategory: Record<NavMainCategory, NavMainItem[]> = {
  none: [],
  workspace: [],
  schedules: [],
  utility: [],
};
for (const item of navMainItems) {
  itemsByCategory[item.category].push(item);
}

const NavGroup = memo(function NavGroup({
<<<<<<< HEAD
  items,
  slug,
  label,
}: {
  items: NavMainItem[];
  slug: string;
  label?: string;
=======
	items,
	slug,
	label,
	pathname,
}: {
	items: NavMainItem[];
	slug: string;
	label?: string;
	pathname: string;
>>>>>>> origin/main
}) {
  if (items.length === 0) {
    return null;
  }

<<<<<<< HEAD
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
                tooltip={item.label}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
=======
	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => {
						const href = `/${slug}${item.link}`;
						const isActive = item.link === ""
							? pathname === `/${slug}` || pathname === `/${slug}/`
							: pathname.startsWith(href);
						return (
							<SidebarMenuItem key={item.link}>
								<SidebarMenuButton
									isActive={isActive}
									render={
										<Link href={href}>
											<HugeiconsIcon icon={item.icon} />
											<span>{item.label}</span>
										</Link>
									}
									tooltip={item.label}
								/>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
>>>>>>> origin/main
});

const categories = Object.keys(categoryLabels) as Exclude<
  NavMainCategory,
  "none"
>[];

export function NavMain() {
<<<<<<< HEAD
  const { activeOrganization } = useOrganizationsContext();
=======
	const { activeOrganization } = useOrganizationsContext();
	const pathname = usePathname();
>>>>>>> origin/main

  if (!activeOrganization?.slug) {
    return null;
  }

  const slug = activeOrganization.slug;

<<<<<<< HEAD
  return (
    <>
      <NavGroup items={itemsByCategory.none} slug={slug} />
      {categories.map((category) => (
        <NavGroup
          items={itemsByCategory[category]}
          key={category}
          label={categoryLabels[category]}
          slug={slug}
        />
      ))}
    </>
  );
=======
	return (
		<>
			<NavGroup items={itemsByCategory.none} slug={slug} pathname={pathname} />
			{categories.map((category) => (
				<NavGroup
					items={itemsByCategory[category]}
					key={category}
					label={categoryLabels[category]}
					slug={slug}
					pathname={pathname}
				/>
			))}
		</>
	);
>>>>>>> origin/main
}
