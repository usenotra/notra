"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Invitation } from "better-auth/plugins/organization";
import { use, useState } from "react";
import { PageContainer } from "@/components/layout/container";
import { columns, type Member } from "@/components/members/columns";
import { DataTable } from "@/components/members/data-table";
import { invitationColumns } from "@/components/members/invitation-columns";
import { InviteMemberModal } from "@/components/members/invite-member-modal";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MembersPage({ params }: PageProps) {
  const { slug } = use(params);
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organization =
    activeOrganization?.slug === slug
      ? activeOrganization
      : getOrganization(slug);
  const [activeTab, setActiveTab] = useState("members");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
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

  const members = membersData?.members as Member[] | undefined;

  const { data: invitations, isLoading: invitationsLoading } = useQuery<
    Invitation[]
  >({
    queryKey: ["invitations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
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
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <div className="space-y-1">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-64 rounded-[20px]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">Members</h1>
            <p className="text-muted-foreground">
              Manage who has access to this organization
            </p>
          </div>
          <Button onClick={() => setIsInviteModalOpen(true)} size="sm">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Invite Member
          </Button>
        </div>

        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList variant="line">
            <TabsTrigger value="members">
              Members
              {members && members.length > 0 && (
                <Badge className="ml-1.5" variant="secondary">
                  {members.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              {pendingInvitations && pendingInvitations.length > 0 && (
                <Badge className="ml-1.5" variant="secondary">
                  {pendingInvitations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4" value="members">
            <DataTable
              columns={columns}
              data={members ?? []}
              isLoading={membersLoading}
            />
          </TabsContent>

          <TabsContent className="mt-4" value="pending">
            <DataTable
              columns={invitationColumns}
              data={pendingInvitations ?? []}
              emptyMessage="No pending invitations."
              isLoading={invitationsLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      <InviteMemberModal
        onOpenChange={setIsInviteModalOpen}
        open={isInviteModalOpen}
        organizationId={organization.id}
      />
    </PageContainer>
  );
}
