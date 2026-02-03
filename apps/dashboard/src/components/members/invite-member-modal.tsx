"use client";

import { Button } from "@notra/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@notra/ui/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";

interface InviteMemberModalProps {
	organizationId?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function InviteMemberModal({
	organizationId,
	open,
	onOpenChange,
}: InviteMemberModalProps) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"member" | "admin" | "owner">("member");
	const queryClient = useQueryClient();

	const { mutate: inviteMember, isPending } = useMutation({
		mutationFn: async () => {
			if (!organizationId) return;
			const { error } = await authClient.organization.inviteMember({
				email,
				role,
				organizationId,
			});

			if (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: () => {
			toast.success("Invitation sent successfully");
			onOpenChange(false); // Close first
			setTimeout(() => {
				// Clear state after closing animation could be better but this is fine
				setEmail("");
				setRole("member");
			}, 300);
			queryClient.invalidateQueries({
				queryKey: ["invitations", organizationId],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!organizationId) {
			toast.error("Organization ID is missing. Please try again.");
			return;
		}

		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			toast.error("Please enter an email address.");
			return;
		}

		inviteMember();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Invite Member</DialogTitle>
					<DialogDescription>
						Invite a new member to your organization. They will receive an email
						invitation.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email address</Label>
						<Input
							id="email"
							type="email"
							placeholder="member@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="role">Role</Label>
						<Select
							value={role}
							onValueChange={(val) =>
								val && setRole(val as "member" | "admin" | "owner")
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select a role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="member">Member</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Sending..." : "Send Invitation"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
