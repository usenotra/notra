"use client";

import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { createColumnHelper } from "@tanstack/react-table";
import type { Invitation } from "better-auth/plugins/organization";
import { InvitationActions } from "./invitation-actions";

const columnHelper = createColumnHelper<Invitation>();

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

export const invitationColumns = [
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => {
      const email = info.getValue();
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              className="size-4 text-muted-foreground"
              icon={Mail01Icon}
            />
          </div>
          <span className="font-medium">{email}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: (info) => <RoleBadge role={info.getValue()} />,
  }),
  columnHelper.accessor("expiresAt", {
    header: "Expires",
    cell: (info) => {
      const expiresAt = info.getValue();
      return (
        <span className="text-muted-foreground text-sm">
          {new Date(expiresAt).toLocaleDateString()}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (info) => <InvitationActions invitation={info.row.original} />,
  }),
];
