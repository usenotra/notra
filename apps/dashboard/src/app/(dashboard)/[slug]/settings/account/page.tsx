"use client";

import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
	ViewIcon,
	ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";
import { PageContainer } from "@/components/layout/container";
import { DeleteAccountSection } from "@/components/settings/delete-account";
import { TitleCard } from "@/components/title-card";
import { authClient } from "@/lib/auth/client";
import { AccountPageSkeleton } from "./skeleton";

const nameSchema = z.string().trim().min(1, "Name cannot be empty");

const passwordSchema = z
	.object({
		currentPassword: z.string().trim().min(1, "Current password is required"),
		newPassword: z
			.string()
			.trim()
			.min(1, "New password cannot be empty")
			.min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().trim().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

interface Account {
	id: string;
	providerId: string;
	accountId: string;
	[key: string]: unknown;
}

export default function SettingsAccountPage() {
	const router = useRouter();
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const user = session?.user;

	const {
		data: accounts,
		refetch: refetchAccounts,
		isError: isAccountsError,
	} = useQuery({
		queryKey: ["accounts"],
		queryFn: async () => {
			const result = await authClient.listAccounts();
			if (result.error) {
				throw new Error(result.error.message ?? "Failed to load accounts");
			}
			return (result.data ?? []) as Account[];
		},
		enabled: !!user,
	});

	if (!user && isSessionPending) {
		return <AccountPageSkeleton />;
	}

	if (!user) {
		router.push("/login");
		return null;
	}

	const hasGoogleLinked = accounts?.some((a) => a.providerId === "google");
	const hasGithubLinked = accounts?.some((a) => a.providerId === "github");
	const hasPasswordAccount = accounts?.some(
		(a) => a.providerId === "credential",
	);

	return (
		<PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="w-full space-y-6 px-4 lg:px-6">
				<div className="space-y-1">
					<h1 className="font-bold text-3xl tracking-tight">Account</h1>
					<p className="text-muted-foreground">
						Manage your profile and account settings
					</p>
				</div>

				<div className="grid gap-6 lg:grid-cols-2">
					<ProfileSection user={user} />
					<LoginDetailsSection
						email={user.email}
						hasPasswordAccount={hasPasswordAccount ?? false}
					/>
					<ConnectedAccountsSection
						accounts={accounts ?? []}
						hasGithubLinked={hasGithubLinked ?? false}
						hasGoogleLinked={hasGoogleLinked ?? false}
						isError={isAccountsError}
						onAccountsChange={refetchAccounts}
					/>
					<DeleteAccountSection />
				</div>
			</div>
		</PageContainer>
	);
}

interface ProfileSectionProps {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
}

function ProfileSection({ user }: ProfileSectionProps) {
	const [isUpdating, setIsUpdating] = useState(false);

	const form = useForm({
		defaultValues: {
			name: user.name,
		},
		onSubmit: async ({ value }) => {
			const validated = nameSchema.safeParse(value.name);

			if (!validated.success) {
				const issue = validated.error?.issues[0];
				toast.error(issue?.message ?? "Invalid name");
				return;
			}

			if (validated.data === user.name) {
				return;
			}

			setIsUpdating(true);
			try {
				const result = await authClient.updateUser({
					name: validated.data,
				});

				if (result.error) {
					toast.error(result.error.message ?? "Failed to update profile");
					return;
				}

				toast.success("Profile updated successfully");
			} catch {
				toast.error("Failed to update profile");
			} finally {
				setIsUpdating(false);
			}
		},
	});

	return (
		<TitleCard heading="Your Profile">
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Avatar className="size-16 rounded-lg after:rounded-lg">
						<AvatarImage
							alt={user.name}
							className="rounded-lg"
							src={user.image ?? undefined}
						/>
						<AvatarFallback className="rounded-lg text-xl">
							{user.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="space-y-1">
						<p className="font-medium text-sm">Profile picture</p>
						<p className="text-muted-foreground text-xs">
							Your profile picture is synced from your connected accounts
						</p>
					</div>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Full Name</Label>
								<div className="flex gap-2">
									<Input
										autoComplete="name"
										id={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="Your name"
										value={field.state.value}
									/>
									<Button disabled={isUpdating} size="default" type="submit">
										{isUpdating ? (
											<Loader2Icon className="size-4 animate-spin" />
										) : (
											"Save"
										)}
									</Button>
								</div>
							</div>
						)}
					</form.Field>
				</form>
			</div>
		</TitleCard>
	);
}

interface LoginDetailsSectionProps {
	email: string;
	hasPasswordAccount: boolean;
}

function LoginDetailsSection({
	email,
	hasPasswordAccount,
}: LoginDetailsSectionProps) {
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);

	const form = useForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			const validated = passwordSchema.safeParse(value);

			if (!validated.success) {
				const issue = validated.error?.issues[0];
				toast.error(issue?.message ?? "Invalid password details");
				return;
			}

			setIsChangingPassword(true);
			try {
				const result = await authClient.changePassword({
					currentPassword: validated.data.currentPassword,
					newPassword: validated.data.newPassword,
					revokeOtherSessions: false,
				});

				if (result.error) {
					toast.error(result.error.message ?? "Failed to change password");
					return;
				}

				toast.success("Password changed successfully");
				form.reset();
			} catch {
				toast.error("Failed to change password");
			} finally {
				setIsChangingPassword(false);
			}
		},
	});

	return (
		<TitleCard heading="Login Details">
			<div className="space-y-6">
				<div className="space-y-2">
					<Label>Email</Label>
					<div className="flex items-center gap-2">
						<div className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-sm">
							{email}
						</div>
						<HugeiconsIcon
							className="text-green-600"
							icon={CheckmarkCircle02Icon}
							size={20}
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						Your email is used to sign in and receive notifications
					</p>
				</div>

				{hasPasswordAccount && (
					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<div className="border-t pt-4">
							<p className="mb-4 font-medium text-sm">Update your password</p>

							<div className="space-y-3">
								<form.Field name="currentPassword">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Current password</Label>
											<div className="relative">
												<Input
													autoComplete="current-password"
													className="pr-9"
													id={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="Enter current password"
													type={showCurrentPassword ? "text" : "password"}
													value={field.state.value}
												/>
												<button
													aria-label={
														showCurrentPassword
															? "Hide current password"
															: "Show current password"
													}
													className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
													onClick={() =>
														setShowCurrentPassword(!showCurrentPassword)
													}
													type="button"
												>
													<HugeiconsIcon
														icon={
															showCurrentPassword ? ViewOffSlashIcon : ViewIcon
														}
														size={16}
													/>
												</button>
											</div>
										</div>
									)}
								</form.Field>

								<form.Field name="newPassword">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>New password</Label>
											<div className="relative">
												<Input
													autoComplete="new-password"
													className="pr-9"
													id={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="Enter new password"
													type={showNewPassword ? "text" : "password"}
													value={field.state.value}
												/>
												<button
													aria-label={
														showNewPassword
															? "Hide new password"
															: "Show new password"
													}
													className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
													onClick={() => setShowNewPassword(!showNewPassword)}
													type="button"
												>
													<HugeiconsIcon
														icon={showNewPassword ? ViewOffSlashIcon : ViewIcon}
														size={16}
													/>
												</button>
											</div>
										</div>
									)}
								</form.Field>

								<form.Field name="confirmPassword">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Confirm new password</Label>
											<Input
												autoComplete="new-password"
												id={field.name}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="Confirm new password"
												type="password"
												value={field.state.value}
											/>
										</div>
									)}
								</form.Field>
							</div>

							<Button
								className="mt-4"
								disabled={isChangingPassword}
								type="submit"
							>
								{isChangingPassword ? (
									<>
										<Loader2Icon className="size-4 animate-spin" />
										Changing...
									</>
								) : (
									"Change password"
								)}
							</Button>
						</div>
					</form>
				)}
			</div>
		</TitleCard>
	);
}

interface ConnectedAccountsSectionProps {
	accounts: Account[];
	hasGoogleLinked: boolean;
	hasGithubLinked: boolean;
	isError: boolean;
	onAccountsChange: () => void;
}

function ConnectedAccountsSection({
	accounts,
	hasGoogleLinked,
	hasGithubLinked,
	isError,
	onAccountsChange,
}: ConnectedAccountsSectionProps) {
	const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

	const canUnlink = accounts.length > 1;

	async function handleLinkAccount(provider: "google" | "github") {
		setLoadingProvider(provider);
		try {
			await authClient.linkSocial({
				provider,
				callbackURL: window.location.pathname,
			});
		} catch {
			toast.error(`Failed to link ${provider} account`);
		} finally {
			setLoadingProvider(null);
		}
	}

	async function handleUnlinkAccount(provider: "google" | "github") {
		if (!canUnlink) {
			toast.error("You must have at least one login method");
			return;
		}

		setLoadingProvider(provider);
		try {
			const result = await authClient.unlinkAccount({
				providerId: provider,
			});

			if (result.error) {
				toast.error(result.error.message ?? `Failed to unlink ${provider}`);
				setLoadingProvider(null);
				return;
			}

			toast.success(`${provider} account unlinked`);
			onAccountsChange();
		} catch {
			toast.error(`Failed to unlink ${provider}`);
		} finally {
			setLoadingProvider(null);
		}
	}

	if (isError) {
		return (
			<TitleCard className="lg:col-span-2" heading="Connected Accounts">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
					<p className="text-destructive text-sm">
						Failed to load connected accounts. Please refresh the page.
					</p>
				</div>
			</TitleCard>
		);
	}

	return (
		<TitleCard className="lg:col-span-2" heading="Connected Accounts">
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Connect your social accounts for easier sign-in
				</p>

				<div className="space-y-3">
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
								<Google className="size-5" />
							</div>
							<div>
								<p className="font-medium text-sm">Google</p>
								<p className="text-muted-foreground text-xs">
									{hasGoogleLinked
										? "Connected to your Google account"
										: "Sign in with Google"}
								</p>
							</div>
						</div>
						{hasGoogleLinked ? (
							<Button
								disabled={!canUnlink || loadingProvider === "google"}
								onClick={() => handleUnlinkAccount("google")}
								size="sm"
								variant="outline"
							>
								{loadingProvider === "google" ? (
									<Loader2Icon className="size-4 animate-spin" />
								) : (
									<>
										<HugeiconsIcon icon={Cancel01Icon} size={16} />
										Disconnect
									</>
								)}
							</Button>
						) : (
							<Button
								disabled={loadingProvider === "google"}
								onClick={() => handleLinkAccount("google")}
								size="sm"
								variant="outline"
							>
								{loadingProvider === "google" ? (
									<Loader2Icon className="size-4 animate-spin" />
								) : (
									"Connect"
								)}
							</Button>
						)}
					</div>

					<div className="flex items-center justify-between rounded-lg border p-4">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
								<Github className="size-5" />
							</div>
							<div>
								<p className="font-medium text-sm">GitHub</p>
								<p className="text-muted-foreground text-xs">
									{hasGithubLinked
										? "Connected to your GitHub account"
										: "Sign in with GitHub"}
								</p>
							</div>
						</div>
						{hasGithubLinked ? (
							<Button
								disabled={!canUnlink || loadingProvider === "github"}
								onClick={() => handleUnlinkAccount("github")}
								size="sm"
								variant="outline"
							>
								{loadingProvider === "github" ? (
									<Loader2Icon className="size-4 animate-spin" />
								) : (
									<>
										<HugeiconsIcon icon={Cancel01Icon} size={16} />
										Disconnect
									</>
								)}
							</Button>
						) : (
							<Button
								disabled={loadingProvider === "github"}
								onClick={() => handleLinkAccount("github")}
								size="sm"
								variant="outline"
							>
								{loadingProvider === "github" ? (
									<Loader2Icon className="size-4 animate-spin" />
								) : (
									"Connect"
								)}
							</Button>
						)}
					</div>
				</div>

				{!canUnlink && (
					<p className="text-muted-foreground text-xs">
						You need at least one connected account or password to sign in
					</p>
				)}
			</div>
		</TitleCard>
	);
}
