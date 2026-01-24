"use client";

import { useMemo } from "react";
import {
	AnalyticsUpIcon,
	CorporateIcon,
	Home01Icon,
	NoteIcon,
	PlugIcon,
	WorkflowSquare07FreeIcons,
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
import { useOrganizationsContext } from "@/components/providers/organization-provider";

type NavMainCategory = "none" | "workspace" | "utility";

interface NavMainItem {
	link: string;
	icon: IconSvgElement;
	label: string;
	category: NavMainCategory;
}

const categoryLabels: Record<Exclude<NavMainCategory, "none">, string> = {
	workspace: "Workspace",
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
		link: "/integrations",
		icon: PlugIcon,
		label: "Integrations",
		category: "utility",
	},
	{
		link: "/triggers",
		icon: WorkflowSquare07FreeIcons,
		label: "Triggers",
		category: "utility",
	},
	{
		link: "/logs",
		icon: AnalyticsUpIcon,
		label: "Logs",
		category: "utility",
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

	const itemsByCategory = useMemo(() => {
		const map: Record<NavMainCategory, NavMainItem[]> = {
			none: [],
			workspace: [],
			utility: [],
		};
		for (const item of navMainItems) {
			map[item.category].push(item);
		}
		return map;
	}, []);

	if (!activeOrganization?.slug) {
		return null;
	}

	const slug = activeOrganization.slug;

	const categories = Object.keys(categoryLabels) as Exclude<
		NavMainCategory,
		"none"
	>[];

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
}