"use client";

import {
  Delete02Icon,
  MoreVerticalIcon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@notra/ui/components/ui/alert-dialog";
import { Button } from "@notra/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";
import type { Member } from "./columns";

interface MemberActionsProps {
  member: Member;
}

export function MemberActions({ member }: MemberActionsProps) {
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  const [isRemoving, setIsRemoving] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<"member" | "admin">(
    (member.role === "admin" ? "admin" : "member") as "member" | "admin"
  );

  // Don't show actions for the current user or if no organization
  if (!activeOrganization || member.userId === currentUser?.id) {
    return null;
  }

  // Don't show actions for owners (they can't be removed)
  if (member.role === "owner") {
    return null;
  }

  async function handleChangeRole() {
    if (!activeOrganization) return;

    // Don't update if role hasn't changed
    if (newRole === member.role) {
      setShowChangeRoleDialog(false);
      return;
    }

    setIsChangingRole(true);
    try {
      const { error } = await authClient.organization.updateMemberRole({
        memberId: member.id,
        role: newRole,
        organizationId: activeOrganization.id,
      });

      if (error) {
        toast.error(error.message || "Failed to update member role");
        return;
      }

      toast.success(
        `${member.user.name}'s role has been updated to ${newRole}`
      );

      await queryClient.invalidateQueries({
        queryKey: ["members", activeOrganization.id],
      });

      setShowChangeRoleDialog(false);
    } catch (error) {
      console.error("Error changing member role:", error);
      toast.error("Failed to update member role");
    } finally {
      setIsChangingRole(false);
    }
  }

  async function handleRemoveMember() {
    if (!activeOrganization) return;

    setIsRemoving(true);
    try {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId: activeOrganization.id,
      });

      if (error) {
        toast.error(error.message || "Failed to remove member");
        return;
      }

      toast.success(
        `${member.user.name} has been removed from the organization`
      );

      await queryClient.invalidateQueries({
        queryKey: ["members", activeOrganization.id],
      });

      setShowRemoveDialog(false);
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="size-8 p-0" variant="ghost">
              <span className="sr-only">Open menu</span>
              <HugeiconsIcon className="size-4" icon={MoreVerticalIcon} />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={isChangingRole || isRemoving}
            onClick={() => {
              setNewRole(
                (member.role === "admin" ? "admin" : "member") as
                  | "member"
                  | "admin"
              );
              setShowChangeRoleDialog(true);
            }}
          >
            <HugeiconsIcon className="mr-2 size-4" icon={UserEdit01Icon} />
            Change role
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isChangingRole || isRemoving}
            onClick={() => setShowRemoveDialog(true)}
            variant="destructive"
          >
            <HugeiconsIcon className="mr-2 size-4" icon={Delete02Icon} />
            Remove member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        onOpenChange={(open) => {
          if (!isChangingRole) {
            setShowChangeRoleDialog(open);
          }
        }}
        open={showChangeRoleDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update {member.user.name}'s role in {activeOrganization.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                disabled={isChangingRole}
                onValueChange={(val) =>
                  val && setNewRole(val as "member" | "admin")
                }
                value={newRole}
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
          </div>
          <DialogFooter>
            <Button
              disabled={isChangingRole}
              onClick={() => setShowChangeRoleDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isChangingRole || newRole === member.role}
              onClick={handleChangeRole}
              type="button"
            >
              {isChangingRole ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!isRemoving) {
            setShowRemoveDialog(open);
          }
        }}
        open={showRemoveDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.user.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {member.user.name} from {activeOrganization.name}
              . They will lose access to all organization content and will need
              to be invited again to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRemoving}
              onClick={handleRemoveMember}
            >
              {isRemoving ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
