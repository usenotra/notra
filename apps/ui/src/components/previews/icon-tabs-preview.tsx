import { LinkIcon, SendIcon } from "lucide-react";

import {
  IconTabs,
  IconTabsList,
  IconTabsTrigger,
} from "../../../registry/notra/icon-tabs/components/icon-tabs";

/** The preview is never hydrated, so the measured indicator never appears. */
const SELECTED_CLASS =
  "data-active:bg-background data-active:shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:data-active:bg-foreground/10";

export default function IconTabsPreview() {
  return (
    <IconTabs className="self-center pb-6" defaultValue="deliveries">
      <IconTabsList aria-label="Webhook views" value="deliveries">
        <IconTabsTrigger
          className={SELECTED_CLASS}
          icon={<SendIcon size={15} />}
          value="deliveries"
        >
          Deliveries
        </IconTabsTrigger>
        <IconTabsTrigger icon={<LinkIcon size={15} />} value="endpoints">
          Endpoints
        </IconTabsTrigger>
      </IconTabsList>
    </IconTabs>
  );
}
