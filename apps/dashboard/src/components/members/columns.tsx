"use client";

import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Badge } from "@notra/ui/components/ui/badge";

import type { TableColumn } from "@/components/motion/table";
import { getUserAvatarUrl } from "@/utils/avatar";

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

export const memberColumns: TableColumn<Member>[] = [
  {
    key: "user",
    header: "User",
    width: "1fr",
    minWidth: "12rem",
    sortValue: (member) => member.user.name,
    cell: (member) => (
      <span className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8 shrink-0">
          <AvatarImage
            alt={member.user.name}
            src={getUserAvatarUrl(member.user.image, member.user.email)}
          />
          <AvatarFallback>
            {member.user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <TruncateWithTooltip className="font-medium">
          {member.user.name}
        </TruncateWithTooltip>
      </span>
    ),
  },
  {
    key: "email",
    header: "Email",
    width: "1fr",
    minWidth: "12rem",
    sortValue: (member) => member.user.email,
    cell: (member) => (
      <TruncateWithTooltip className="text-muted-foreground">
        {member.user.email}
      </TruncateWithTooltip>
    ),
  },
  {
    key: "role",
    header: "Role",
    width: "7rem",
    sortable: true,
    sortValue: (member) => member.role,
    cell: (member) => <RoleBadge role={member.role} />,
  },
  {
    key: "actions",
    header: "",
    align: "right",
    width: "3.5rem",
    minWidth: "3.5rem",
    cell: (member) => <MemberActions member={member} />,
  },
];
