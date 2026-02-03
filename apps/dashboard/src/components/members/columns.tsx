"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";
import { createColumnHelper } from "@tanstack/react-table";
import { MemberActions } from "./member-actions";

export interface Member {
	id: string;
	userId: string;
	role: string;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
}

const columnHelper = createColumnHelper<Member>();

function RoleBadge({ role }: { role: string }) {
	const variants: Record<string, "default" | "secondary" | "outline"> = {
		owner: "default",
		admin: "secondary",
		member: "outline",
	};

	return (
		<Badge variant={variants[role] ?? "outline"}>
			{role.charAt(0).toUpperCase() + role.slice(1)}
		</Badge>
	);
}

export const columns = [
	columnHelper.accessor("user", {
		header: "User",
		cell: (info) => {
			const user = info.getValue();
			return (
				<div className="flex items-center gap-3">
					<Avatar className="size-8">
						<AvatarImage alt={user.name} src={user.image ?? undefined} />
						<AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
					</Avatar>
					<span className="font-medium">{user.name}</span>
				</div>
			);
		},
	}),
	columnHelper.accessor("user.email", {
		header: "Email",
		cell: (info) => (
			<span className="text-muted-foreground">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("role", {
		header: "Role",
		cell: (info) => <RoleBadge role={info.getValue()} />,
	}),
	columnHelper.display({
		id: "actions",
		header: "",
		cell: (info) => <MemberActions member={info.row.original} />,
	}),
];
