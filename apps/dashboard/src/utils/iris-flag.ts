import { IRIS_NAV_LINK } from "@/constants/iris";
import type { NavMainItem } from "@/types/components/nav";

export function filterIrisNavItems(
  items: NavMainItem[],
  irisVisible: boolean
): NavMainItem[] {
  if (irisVisible) {
    return items;
  }
  return items.filter((item) => item.link !== IRIS_NAV_LINK);
}
