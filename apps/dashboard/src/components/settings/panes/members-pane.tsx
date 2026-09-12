"use client";

import { Badge } from "@notra/ui/components/ui/badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { memberColumns } from "@/components/members/columns";
import { invitationColumns } from "@/components/members/invitation-columns";
import { InviteMemberPopover } from "@/components/members/invite-member-popover";
import { Table } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { SettingsPane } from "@/components/settings/settings-pane";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { authClient } from "@/lib/auth/client";
import { tableHeightFor } from "@/utils/table";

export function MembersSettingsPane() {
  const { activeOrganization: organization } = useOrganizationsContext();
  const [activeTab, setActiveTab] = useState("members");

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        return null;
      }
      const { data, error } = await authClient.organization.listMembers({
        query: {
          organizationId: organization.id,
        },
      });
      if (error) {
        throw new Error("Failed to fetch members");
      }
      return data;
    },
    enabled: !!organization?.id,
  });

  const members = membersData?.members;

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["invitations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        return [];
      }
      const { data, error } = await authClient.organization.listInvitations({
        query: {
          organizationId: organization.id,
        },
      });
      if (error) {
        throw new Error("Failed to fetch invitations");
      }
      return data ?? [];
    },
    enabled: !!organization?.id,
  });

  const pendingInvitations = invitations?.filter(
    (inv) => inv.status === "pending"
  );

  if (!organization) {
    return (
      <SettingsPane>
        <Skeleton className="h-64 rounded-lg" />
      </SettingsPane>
    );
  }

  return (
    <SettingsPane>
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList aria-label="Member lists">
            <TabsTrigger value="members">
              Members
              {members && members.length > 0 ? (
                <Badge size="sm" variant="secondary">
                  {members.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingInvitations && pendingInvitations.length > 0 ? (
                <Badge size="sm" variant="secondary">
                  {pendingInvitations.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>
          <InviteMemberPopover organizationId={organization.id} />
        </div>

        <TabsContent className="mt-4" value="members">
          <Table
            columns={memberColumns}
            data={members ?? []}
            emptyState="No members found."
            getRowId={(member) => member.id}
            height={tableHeightFor(membersLoading ? 3 : (members?.length ?? 0))}
            loading={membersLoading}
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </TabsContent>

        <TabsContent className="mt-4" value="pending">
          <Table
            columns={invitationColumns}
            data={pendingInvitations ?? []}
            emptyState="No pending invitations."
            getRowId={(invitation) => invitation.id}
            height={tableHeightFor(
              invitationsLoading ? 3 : (pendingInvitations?.length ?? 0)
            )}
            loading={invitationsLoading}
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </TabsContent>
      </Tabs>
    </SettingsPane>
  );
}
