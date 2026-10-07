"use client";

import { LinkIcon, SendIcon } from "lucide-react";
import { useState } from "react";

import {
  IconTabs,
  IconTabsList,
  IconTabsTrigger,
} from "../components/icon-tabs";

export default function IconTabsExample() {
  const [tab, setTab] = useState("deliveries");

  return (
    <IconTabs className="items-center p-6" onValueChange={setTab} value={tab}>
      <IconTabsList aria-label="Webhook views" className="w-64" value={tab}>
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
