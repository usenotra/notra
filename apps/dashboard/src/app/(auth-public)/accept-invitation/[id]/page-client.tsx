"use client";

import {
	ArrowLeft02Icon,
	Cancel01Icon,
	Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Button, buttonVariants } from "@notra/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@notra/ui/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { cn } from "@notra/ui/lib/utils";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { authClient } from "@/lib/auth/client";

interface InvitationData {
	id: string;
	organizationId: string;
	organizationName: string;
	organizationSlug: string;
	inviterEmail: string;
	inviterName: string;
	inviterId: string;
	email: string;
	role: string | null;
	status: "pending" | "accepted" | "rejected" | "canceled";
	expiresAt: Date;
	expired: boolean;
}

interface PageClientProps {
	invitationId: string;
	invitation: InvitationData;
	user: {
		id: string;
		email: string;
		emailVerified: boolean;
		name: string;
		createdAt: Date;
		updatedAt: Date;
		image?: string | null | undefined;
	} | null;
	initialError?: string | null;
}

type InviteStatus = "pending" | "accepted" | "rejected";

function PageClient({
	invitationId,
	invitation,
	user: initialUser,
	initialError,
}: PageClientProps) {
	const { data: session } = authClient.useSession();
	const sessionUser = session?.user;
	const [user, setUser] = useState(initialUser);
	const [inviteStatus, setInviteStatus] = useState<InviteStatus>("pending");
	const [error, setError] = useState<string | null>(initialError ?? null);
	const [accepting, setAccepting] = useState(false);
	const [rejecting, setRejecting] = useState(false);
	const router = useRouter();

	// Sync session user with local state
	useEffect(() => {
		if (sessionUser) {
			setUser(sessionUser);
		}
	}, [sessionUser]);

	const handleAccept = async () => {
		setAccepting(true);
		setError(null);
		try {
			const res = await authClient.organization.acceptInvitation({
				invitationId: invitationId,
			});

			if (res.error) {
				setError(res.error.message || "Failed to accept invitation");
				return;
			}

			setInviteStatus("accepted");
			router.push(`/${invitation.organizationSlug}`);
		} catch (error) {
			console.error("Error accepting invitation:", error);
			setError(
				error instanceof Error
					? error.message
					: "An unexpected error occurred. Please try again.",
			);
		} finally {
			setAccepting(false);
		}
	};

	const handleReject = async () => {
		setRejecting(true);
		setError(null);
		try {
			const res = await authClient.organization.rejectInvitation({
				invitationId: invitationId,
			});

			if (res.error) {
				setError(res.error.message || "Failed to reject invitation");
				return;
			}

			setInviteStatus("rejected");
		} catch (error) {
			console.error("Error rejecting invitation:", error);
			setError(
				error instanceof Error
					? error.message
					: "An unexpected error occurred. Please try again.",
			);
		} finally {
			setRejecting(false);
		}
	};

	// Show error state if invitation is invalid/expired
	if (initialError || invitation.expired || invitation.status !== "pending") {
		return (
			<InviteError
				message={initialError ?? "This invitation is no longer valid."}
			/>
		);
	}

	// Show auth forms if user is not logged in
	if (!user) {
		return (
			<Card className="mx-auto w-full max-w-md rounded-[24px] px-5 py-7">
				<CardContent>
					<Tabs defaultValue="login" className="w-full">
						<TabsList className="grid w-full grid-cols-2 bg-muted">
							<TabsTrigger
								value="login"
								className="text-foreground data-[active]:bg-background data-[active]:text-foreground data-[active]:font-medium"
							>
								Log in
							</TabsTrigger>
							<TabsTrigger
								value="signup"
								className="text-foreground data-[active]:bg-background data-[active]:text-foreground data-[active]:font-medium"
							>
								Sign up
							</TabsTrigger>
						</TabsList>
						<TabsContent value="login" className="mt-6">
							<div className="mb-6 text-center text-sm">
								<strong>{invitation.inviterEmail}</strong> has invited you to
								join their organization. Please sign in to proceed.
							</div>
							<LoginForm
								title=""
								description=""
								returnTo={`/accept-invitation/${invitationId}`}
								showSignupLink={false}
								showForgotPasswordLink={true}
							/>
						</TabsContent>
						<TabsContent value="signup" className="mt-6">
							<div className="mb-6 text-center text-sm">
								<strong>{invitation.inviterEmail}</strong> has invited you to
								join their organization. Please sign up to proceed.
							</div>
							<SignupForm
								title=""
								description=""
								returnTo={`/accept-invitation/${invitationId}`}
								showLoginLink={false}
								showForgotPasswordLink={false}
							/>
						</TabsContent>
					</Tabs>
					{error && (
						<div className="mt-4 rounded-sm border border-destructive bg-destructive/10 p-3">
							<p className="text-center text-destructive text-sm">{error}</p>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	// Show invitation acceptance UI if user is logged in
	return (
		<Card className="mx-auto w-full max-w-md rounded-[24px] px-5 py-7">
			<CardHeader
				className={cn("items-center", inviteStatus !== "pending" && "sr-only")}
			>
				<CardTitle className="font-medium">Invitation</CardTitle>
				<CardDescription>
					You&apos;ve been invited to join a workspace
				</CardDescription>
			</CardHeader>
			<CardContent>
				{inviteStatus === "pending" && (
					<div className="mt-5 flex flex-col gap-8">
						<div className="flex items-center justify-center gap-4">
							<Avatar className="size-14">
								<AvatarImage src={user.image || ""} />
								<AvatarFallback>
									{user.name
										.split(" ")
										.map((n) => n[0])
										.join("")
										.toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<svg
								className="size-6"
								fill="none"
								stroke="currentColor"
								strokeWidth={1}
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Arrow</title>
								<path
									d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<Avatar className="size-14">
								<AvatarImage src="" />
								<AvatarFallback>
									{invitation.organizationName
										.split(" ")
										.map((n) => n[0])
										.join("")
										.toUpperCase()}
								</AvatarFallback>
							</Avatar>
						</div>
						<p className="text-center text-sm">
							<strong>{invitation.inviterEmail}</strong> has invited you to join{" "}
							<strong>{invitation.organizationName}</strong>.
						</p>
					</div>
				)}
				{inviteStatus === "accepted" && (
					<div className="space-y-4 pt-8 pb-4">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
							<HugeiconsIcon
								icon={Tick01Icon}
								className="h-8 w-8 text-green-600"
							/>
						</div>
						<h2 className="text-center font-medium text-2xl">
							Welcome to {invitation.organizationName}!
						</h2>
						<p className="text-center">
							We&apos;re excited to have you on board!
						</p>
					</div>
				)}
				{inviteStatus === "rejected" && (
					<div className="space-y-4 pt-8 pb-4">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
							<HugeiconsIcon
								icon={Cancel01Icon}
								className="h-8 w-8 text-red-600"
							/>
						</div>
						<h2 className="text-center font-medium text-2xl">Declined</h2>
						<p className="text-center text-muted-foreground">
							You&apos;ve declined the invitation to join{" "}
							{invitation.organizationName}.
						</p>
						<div className="flex items-center justify-center">
							<Link
								className={buttonVariants({
									variant: "outline",
									className: "flex items-center gap-2",
								})}
								href="/"
							>
								<HugeiconsIcon icon={ArrowLeft02Icon} className="size-4" />
								<span>Back home</span>
							</Link>
						</div>
					</div>
				)}
			</CardContent>
			{error && inviteStatus === "pending" && (
				<div className="mt-4 rounded-sm border border-destructive bg-destructive/10 p-3">
					<p className="text-center text-destructive text-sm">{error}</p>
				</div>
			)}
			{inviteStatus === "pending" && (
				<CardFooter className="mt-4 grid grid-cols-2 gap-6">
					<Button
						disabled={rejecting || accepting}
						onClick={handleReject}
						variant="outline"
					>
						{rejecting ? (
							<Loader2Icon className="size-4 animate-spin" />
						) : (
							"Reject"
						)}
					</Button>
					<Button
						disabled={accepting || rejecting}
						onClick={handleAccept}
						variant="default"
					>
						{accepting ? (
							<Loader2Icon className="size-4 animate-spin" />
						) : (
							"Accept"
						)}
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}

export default PageClient;

function InviteError({ message }: { message: string }) {
	return (
		<Card className="mx-auto w-full max-w-md rounded-[24px] px-5 py-7">
			<CardHeader className="text-center">
				<CardTitle className="font-medium">Invalid Invite</CardTitle>
				<CardDescription className="sr-only">
					This invite is invalid or you don&apos;t have the correct permissions.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col items-center gap-6">
					<p className="text-center text-muted-foreground">{message}</p>
					<Link
						className={buttonVariants({
							variant: "outline",
							className: "flex items-center gap-2",
						})}
						href="/"
					>
						<HugeiconsIcon
							icon={ArrowLeft02Icon}
							className="size-4 text-muted-foreground"
						/>
						<span>Back home</span>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}
