export type OrganizationMembershipAction = "leave" | "delete";

export function getOrganizationMembershipAction(isOwnedByCurrentUser: boolean) {
  return isOwnedByCurrentUser ? "delete" : "leave";
}

export function getOrganizationMembershipActionDescriptionKey(
  action: OrganizationMembershipAction,
  hasOtherMembers: boolean
):
  | "leaveDescription"
  | "deleteWithMembersDescription"
  | "deleteSoleDescription" {
  if (action === "leave") {
    return "leaveDescription";
  }

  if (hasOtherMembers) {
    return "deleteWithMembersDescription";
  }

  return "deleteSoleDescription";
}
