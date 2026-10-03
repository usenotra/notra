"use client";

import {
  Delete02Icon,
  MoreVerticalIcon,
  UserEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
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
import { useReducer } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";
import { isTeamMemberLimitError } from "@/lib/billing/limits";
import { useRouter } from "@/lib/navigation";
import { errorMessageOr } from "@/lib/utils";
import type {
  MemberActionsAction,
  MemberActionsState,
  MemberRole,
} from "@/types/members/member-actions";

import type { Member } from "./columns";

interface MemberActionsProps {
  member: Member;
}

function memberActionsReducer(
  state: MemberActionsState,
  action: MemberActionsAction
): MemberActionsState {
  switch (action.type) {
    case "removeStarted":
      return { ...state, isRemoving: true };
    case "removeFinished":
      return { ...state, isRemoving: false };
    case "roleChangeStarted":
      return { ...state, isChangingRole: true };
    case "roleChangeFinished":
      return { ...state, isChangingRole: false };
    case "removeDialogChanged":
      return { ...state, showRemoveDialog: action.open };
    case "roleDialogChanged":
      return { ...state, showChangeRoleDialog: action.open };
    case "roleSelected":
      return { ...state, newRole: action.role };
    default:
      return state;
  }
}

function normalizeMemberRole(role: string): MemberRole {
  return role === "admin" ? "admin" : "member";
}

export function MemberActions({ member }: MemberActionsProps) {
  const t = useTranslations("members.memberActions");
  const tMembersShared = useTranslations("members.shared");
  const tMembers = useTranslations("members");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  const [
    {
      isRemoving,
      isChangingRole,
      showRemoveDialog,
      showChangeRoleDialog,
      newRole,
    },
    dispatch,
  ] = useReducer(memberActionsReducer, {
    isRemoving: false,
    isChangingRole: false,
    showRemoveDialog: false,
    showChangeRoleDialog: false,
    newRole: normalizeMemberRole(member.role),
  });

  // Don't show actions for the current user or if no organization
  if (!activeOrganization || member.userId === currentUser?.id) {
    return null;
  }

  // Don't show actions for owners (they can't be removed)
  if (member.role === "owner") {
    return null;
  }

  async function handleChangeRole() {
    if (!activeOrganization) {
      return;
    }

    // Don't update if role hasn't changed
    if (newRole === member.role) {
      dispatch({ type: "roleDialogChanged", open: false });
      return;
    }

    dispatch({ type: "roleChangeStarted" });
    try {
      const { error } = await authClient.organization.updateMemberRole({
        memberId: member.id,
        role: newRole,
        organizationId: activeOrganization.id,
      });

      if (error) {
        const message = error.message || t("updateRoleFailed");

        if (isTeamMemberLimitError(error.code)) {
          toast.error(message, {
            action: {
              label: tMembers("viewPlans"),
              onClick: () =>
                router.push(`/${activeOrganization.slug}/settings/billing`),
            },
          });
          dispatch({ type: "roleChangeFinished" });
          return;
        }

        toast.error(message);
        dispatch({ type: "roleChangeFinished" });
        return;
      }

      toast.success(
        t("roleUpdated", {
          name: member.user.name,
          role: tMembers("roleLabel", { role: newRole }),
        })
      );

      await queryClient.invalidateQueries({
        queryKey: ["members", activeOrganization.id],
      });

      dispatch({ type: "roleDialogChanged", open: false });
    } catch (error) {
      console.error("Error changing member role:", error);
      toast.error(t("updateRoleFailed"));
    }
    dispatch({ type: "roleChangeFinished" });
  }

  async function handleRemoveMember() {
    if (!activeOrganization) {
      return;
    }

    dispatch({ type: "removeStarted" });
    try {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId: activeOrganization.id,
      });

      if (error) {
        toast.error(errorMessageOr(error.message, t("removeFailed")));
        dispatch({ type: "removeFinished" });
        return;
      }

      toast.success(t("removed", { name: member.user.name }));

      await queryClient.invalidateQueries({
        queryKey: ["members", activeOrganization.id],
      });

      dispatch({ type: "removeDialogChanged", open: false });
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error(t("removeFailed"));
    }
    dispatch({ type: "removeFinished" });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="size-8 p-0" variant="ghost">
              <span className="sr-only">{tCommon("labels.openMenu")}</span>
              <HugeiconsIcon className="size-4" icon={MoreVerticalIcon} />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={isChangingRole || isRemoving}
            onClick={() => {
              dispatch({
                type: "roleSelected",
                role: normalizeMemberRole(member.role),
              });
              dispatch({ type: "roleDialogChanged", open: true });
            }}
          >
            <HugeiconsIcon className="mr-2 size-4" icon={UserEdit01Icon} />
            {tMembersShared("changeRole")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isChangingRole || isRemoving}
            onClick={() =>
              dispatch({ type: "removeDialogChanged", open: true })
            }
            variant="destructive"
          >
            <HugeiconsIcon className="mr-2 size-4" icon={Delete02Icon} />
            {tMembersShared("removeMember")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        onOpenChange={(open) => {
          if (!isChangingRole) {
            dispatch({ type: "roleDialogChanged", open });
          }
        }}
        open={showChangeRoleDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tMembersShared("changeRole")}</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {t("changeRoleDescription", {
                name: member.user.name,
                organization: activeOrganization.name,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">{tCommon("labels.role")}</Label>
              <Select
                disabled={isChangingRole}
                onValueChange={(val) =>
                  val &&
                  dispatch({
                    type: "roleSelected",
                    role: normalizeMemberRole(val),
                  })
                }
                value={newRole}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    {tMembers("roleLabel", { role: "member" })}
                  </SelectItem>
                  <SelectItem value="admin">
                    {tMembers("roleLabel", { role: "admin" })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isChangingRole}
              onClick={() =>
                dispatch({ type: "roleDialogChanged", open: false })
              }
              type="button"
              variant="outline"
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              disabled={isChangingRole || newRole === member.role}
              onClick={handleChangeRole}
              type="button"
            >
              {isChangingRole ? tCommon("labels.updating") : t("updateRole")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!isRemoving) {
            dispatch({ type: "removeDialogChanged", open });
          }
        }}
        open={showRemoveDialog}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle className="wrap-anywhere">
              {t("removeTitle", { name: member.user.name })}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription className="wrap-anywhere">
              {t("removeDescription", {
                name: member.user.name,
                organization: activeOrganization.name,
              })}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={isRemoving}>
              {tCommon("actions.cancel")}
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isRemoving}
              onClick={handleRemoveMember}
            >
              {isRemoving ? t("removing") : tMembersShared("removeMember")}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
