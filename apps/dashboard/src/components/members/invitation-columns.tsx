"use client";

import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";

import type { TableColumn } from "@/components/motion/table";
import type { InvitationSummary } from "@/types/organizations/actions";

import { InvitationActions } from "./invitation-actions";

function RoleBadge({ role }: { role: string | null | undefined }) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    owner: "default",
    admin: "secondary",
    member: "outline",
  };

  const roleValue = role || "member";

  return (
    <Badge variant={variants[roleValue] ?? "outline"}>
      {roleValue.charAt(0).toUpperCase() + roleValue.slice(1)}
    </Badge>
  );
}

export const invitationColumns: TableColumn<InvitationSummary>[] = [
  {
    key: "email",
    header: "Email",
    width: "1fr",
    minWidth: "12rem",
    sortValue: (invitation) => invitation.email,
    cell: (invitation) => (
      <span className="flex min-w-0 items-center gap-3">
        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
          <HugeiconsIcon
            className="text-muted-foreground size-4"
            icon={Mail01Icon}
          />
        </span>
        <TruncateWithTooltip className="font-medium">
          {invitation.email}
        </TruncateWithTooltip>
      </span>
    ),
  },
  {
    key: "role",
    header: "Role",
    width: "7rem",
    sortable: true,
    sortValue: (invitation) => invitation.role ?? "member",
    cell: (invitation) => <RoleBadge role={invitation.role} />,
  },
  {
    key: "expiresAt",
    header: "Expires",
    width: "8rem",
    sortable: true,
    sortValue: (invitation) =>
      new Date(invitation.expiresAt).getTime() || Number.MAX_SAFE_INTEGER,
    cell: (invitation) => (
      <span className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
        {new Date(invitation.expiresAt).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    width: "3.5rem",
    minWidth: "3.5rem",
    cell: (invitation) => <InvitationActions invitation={invitation} />,
  },
];
