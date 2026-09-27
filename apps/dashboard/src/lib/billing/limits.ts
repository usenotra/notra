import { ACTION_ERROR_CODES } from "@/constants/actions";

export function isTeamMemberLimitError(code?: string | null): boolean {
  return code === ACTION_ERROR_CODES.TEAM_MEMBER_LIMIT;
}
