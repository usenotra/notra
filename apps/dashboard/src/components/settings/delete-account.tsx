"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@notra/ui/components/ui/alert-dialog";
import { Button } from "@notra/ui/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TitleCard } from "@/components/title-card";
import { authClient } from "@/lib/auth/client";

export function DeleteAccountSection() {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleDeleteAccount() {
		setIsDeleting(true);
		try {
			const result = await authClient.deleteUser({
				callbackURL: "/",
			});
			if (result?.error) {
				toast.error(result.error.message ?? "Failed to delete account");
			} else {
				toast.success("Account deleted successfully");
				router.push("/");
			}
		} catch {
			toast.error("Failed to delete account");
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<TitleCard
			className="border-destructive/50 bg-destructive/5 lg:col-span-2"
			heading="Delete Account"
		>
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Permanently remove your Personal Account and all of its contents from
					the Notra platform. This action is not reversible, so please continue
					with caution.
				</p>
				<div className="flex justify-end">
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button variant="destructive">Delete Personal Account</Button>
							}
						/>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete
									your account and remove your data from our servers.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									disabled={isDeleting}
									onClick={handleDeleteAccount}
								>
									{isDeleting ? (
										<>
											<Loader2Icon className="size-4 animate-spin" />
											Deleting...
										</>
									) : (
										"Delete Account"
									)}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</TitleCard>
	);
}
