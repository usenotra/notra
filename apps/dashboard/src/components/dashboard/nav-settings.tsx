"use client";

import {
	AnalyticsUpIcon,
	CreditCardIcon,
	Settings01Icon,
	UserCircleIcon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	useSidebar,
} from "@notra/ui/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavSettingsItem {
	label: string;
	url: string;
	icon: IconSvgElement;
}

const accountItems: NavSettingsItem[] = [
	{
		label: "Account",
		url: "settings/account",
		icon: UserCircleIcon,
	},
];

const organizationItems: NavSettingsItem[] = [
	{
		label: "General",
		url: "settings/general",
		icon: Settings01Icon,
	},
	{
		label: "Members",
		url: "settings/members",
		icon: UserGroupIcon,
	},
	{
		label: "Billing",
		url: "billing",
		icon: CreditCardIcon,
	},
	{
		label: "Usage",
		url: "billing/usage",
		icon: AnalyticsUpIcon,
	},
];

interface NavSettingsProps {
	slug: string;
}

export function NavSettings({ slug }: NavSettingsProps) {
	const pathname = usePathname();
	const { open } = useSidebar();

	const isActive = (url: string) => pathname === `/${slug}/${url}`;

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel>Account</SidebarGroupLabel>
				<SidebarMenu>
					{accountItems.map((item) => (
						<SidebarMenuButton
							isActive={isActive(item.url)}
							key={item.label}
							render={
								<Link href={`/${slug}/${item.url}`}>
									<HugeiconsIcon icon={item.icon} />
									<span>{item.label}</span>
								</Link>
							}
							tooltip={item.label}
						/>
					))}
				</SidebarMenu>
			</SidebarGroup>

			<SidebarGroup>
				<SidebarGroupLabel>Organization</SidebarGroupLabel>
				<SidebarMenu>
					{organizationItems.map((item) => (
						<SidebarMenuButton
							isActive={isActive(item.url)}
							key={item.label}
							render={
								<Link href={`/${slug}/${item.url}`}>
									<HugeiconsIcon icon={item.icon} />
									<span>{item.label}</span>
								</Link>
							}
							tooltip={item.label}
						/>
					))}
				</SidebarMenu>
			</SidebarGroup>
		</>
	);
}
