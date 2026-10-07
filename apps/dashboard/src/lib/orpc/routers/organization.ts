import { type } from "@orpc/server";

import {
  cancelInvitation,
  createOrganization,
  getFullOrganization,
  getOrganizationSummary,
  inviteMember,
  listInvitations,
  listMembers,
  listOrganizations,
  removeMember,
  resendInvitation,
  setActiveOrganization,
  updateMemberRole,
  updateOrganization,
} from "@/lib/organizations/actions";
import { baseProcedure } from "@/lib/orpc/base";
import type {
  CreateOrganizationInput,
  InvitationActionInput,
  InviteMemberInput,
  ListMembersInput,
  OrganizationLookupInput,
  OrganizationScopedQueryInput,
  RemoveMemberInput,
  SetActiveOrganizationInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from "@/types/organizations/actions";

// Each operation authenticates, validates its input and answers with an
// `ActionResult`, so the procedures only carry the call.
export const organizationRouter = {
  create: baseProcedure
    .input(type<CreateOrganizationInput>())
    .handler(({ input }) => createOrganization(input)),
  update: baseProcedure
    .input(type<UpdateOrganizationInput>())
    .handler(({ input }) => updateOrganization(input)),
  list: baseProcedure.handler(() => listOrganizations()),
  setActive: baseProcedure
    .input(type<SetActiveOrganizationInput>())
    .handler(({ input }) => setActiveOrganization(input)),
  getSummary: baseProcedure
    .input(type<string>())
    .handler(({ input }) => getOrganizationSummary(input)),
  getFull: baseProcedure
    .input(type<OrganizationLookupInput | undefined>())
    .handler(({ input }) => getFullOrganization(input)),
  listMembers: baseProcedure
    .input(type<ListMembersInput | undefined>())
    .handler(({ input }) => listMembers(input)),
  updateMemberRole: baseProcedure
    .input(type<UpdateMemberRoleInput>())
    .handler(({ input }) => updateMemberRole(input)),
  removeMember: baseProcedure
    .input(type<RemoveMemberInput>())
    .handler(({ input }) => removeMember(input)),
  listInvitations: baseProcedure
    .input(type<OrganizationScopedQueryInput | undefined>())
    .handler(({ input }) => listInvitations(input)),
  inviteMember: baseProcedure
    .input(type<InviteMemberInput>())
    .handler(({ input }) => inviteMember(input)),
  cancelInvitation: baseProcedure
    .input(type<InvitationActionInput>())
    .handler(({ input }) => cancelInvitation(input)),
  resendInvitation: baseProcedure
    .input(type<InvitationActionInput>())
    .handler(({ input }) => resendInvitation(input)),
};
