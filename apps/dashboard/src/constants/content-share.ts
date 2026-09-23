import { Globe02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { POST_VISIBILITIES } from "@notra/db/constants/content";
import type { PostVisibility } from "@notra/schemas/dashboard/content";

export const CONTENT_SHARE_OPTIONS = [
  {
    value: "organization",
    label: "Organization",
    description: "Anyone in this organization can access",
    icon: UserGroupIcon,
  },
  {
    value: "unlisted",
    label: "Anyone with the link",
    description: "No sign-in required",
    icon: Globe02Icon,
  },
] as const satisfies readonly {
  description: string;
  icon: typeof UserGroupIcon;
  label: string;
  value: PostVisibility;
}[];

const POST_VISIBILITY_SET = new Set<string>(POST_VISIBILITIES);

export function isPostVisibility(value: string): value is PostVisibility {
  return POST_VISIBILITY_SET.has(value);
}

export function getContentShareOption(visibility: PostVisibility) {
  for (const option of CONTENT_SHARE_OPTIONS) {
    if (option.value === visibility) {
      return option;
    }
  }

  return CONTENT_SHARE_OPTIONS[0];
}
