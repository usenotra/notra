import { LinkIcon, SendIcon } from "lucide-react";

import {
  IconTabs,
  IconTabsList,
  IconTabsTrigger,
} from "../../../registry/notra/icon-tabs/components/icon-tabs";

export default function IconTabsPreview() {
  return (
    <IconTabs className="self-center pb-6" defaultValue="deliveries">
      <IconTabsList aria-label="Webhook views" value="deliveries">
        <IconTabsTrigger icon={<SendIcon size={15} />} value="deliveries">
          Deliveries
        </IconTabsTrigger>
        <IconTabsTrigger icon={<LinkIcon size={15} />} value="endpoints">
          Endpoints
        </IconTabsTrigger>
      </IconTabsList>
    </IconTabs>
  );
}
