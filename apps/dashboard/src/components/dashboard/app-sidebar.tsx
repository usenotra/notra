"use client";

import { ArrowLeft01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter, SidebarGroup, SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	useSidebar
} from "@notra/ui/components/ui/sidebar";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavSettings } from "./nav-settings";
import { NavUser } from "./nav-user";
import { OrgSelector } from "./org-selector";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

// Animation variants hoisted outside component to prevent recreation on each render
const createMainVariants = (shouldReduceMotion: boolean | null) => ({
	initial: shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: "-100%" },
	animate: { opacity: 1, x: 0 },
	exit: shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: "-100%" },
});

const createSettingsVariants = (shouldReduceMotion: boolean | null) => ({
	initial: shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: "100%" },
	animate: { opacity: 1, x: 0 },
	exit: shouldReduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: "100%" },
});

const TRANSITION = { duration: 0.2, type: "spring" as const, bounce: 0.1 };

export function DashboardSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const { activeOrganization } = useOrganizationsContext();
	const { open } = useSidebar();
	const shouldReduceMotion = useReducedMotion();
	const slug = activeOrganization?.slug ?? "";

	// Check if we're on a settings page (billing or other settings)
	const isSettingsRoute =
		pathname.includes("/settings") || pathname.includes("/billing");

	const mainVariants = shouldReduceMotion ? createMainVariants(true) : createMainVariants(false);
	const settingsVariants = shouldReduceMotion ? createSettingsVariants(true) : createSettingsVariants(false);

	return (
		<Sidebar
			collapsible="icon"
			{...props}
			className="overflow-hidden border-none"
		>
			<AnimatePresence initial={false} mode="popLayout">
				{isSettingsRoute ? (
					<motion.div
						key="settings"
						variants={settingsVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						transition={TRANSITION}
						className="flex flex-1 flex-col"
					>
						<SidebarHeader>
							<OrgSelector />
							<SidebarMenu>
								<SidebarMenuButton
									className="border border-transparent transition-colors duration-200 hover:bg-sidebar-accent"
									render={
										<Link href={`/${slug}`}>
											<HugeiconsIcon icon={ArrowLeft01Icon} />
											<span>Back</span>
										</Link>
									}
									tooltip="Back"
								/>
							</SidebarMenu>
						</SidebarHeader>
						<SidebarContent>
							<NavSettings slug={slug} />
						</SidebarContent>
						<SidebarFooter className="gap-0">
							<ThemeToggle />
							<NavUser />
						</SidebarFooter>
					</motion.div>
				) : (
					<motion.div
						key="main"
						variants={mainVariants}
						initial="initial"
						animate="animate"
						exit="exit"
						transition={TRANSITION}
						className="flex flex-1 flex-col"
					>
						<SidebarHeader>
							<OrgSelector />
						</SidebarHeader>
						<SidebarContent>
							<NavMain />
							<NavSecondary className="mt-auto" />
						</SidebarContent>
						<SidebarFooter className="gap-0">
							<SidebarGroup className={cn(open ? "px-2" : "px-0")}>
								<SidebarMenu>
									<SidebarMenuButton
										render={
											<Link href={`/${slug}/settings/account`}>
												<HugeiconsIcon icon={Settings01Icon} />
												<span>Settings</span>
											</Link>
										}
										tooltip="Settings"
									/>
									<ThemeToggle />
								</SidebarMenu>
								<NavUser />
							</SidebarGroup>
						</SidebarFooter>
					</motion.div>
				)}
			</AnimatePresence>
		</Sidebar>
	);
}
