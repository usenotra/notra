"use client";

import {
  ArrowReloadHorizontalIcon,
  Link04Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  IconTabsList,
  IconTabsTrigger,
} from "@notra/ui/components/ui/icon-tabs";
import { Tabs } from "@notra/ui/components/ui/tabs";
import { useState } from "react";

import { DesignSystemSectionHeader } from "@/components/design-system/design-system-section-header";

export function IconTabsSection() {
  const [tab, setTab] = useState("deliveries");

  return (
    <section className="scroll-mt-10 space-y-6" id="icon-tabs">
      <DesignSystemSectionHeader
        description="Segmented selector from @notra/ui. Inactive tabs stay text-only; the icon slides in beside the label of the active one while the indicator follows the resize."
        id="icon-tabs"
        title="Icon Tabs"
      />
      <Card>
        <CardHeader>
          <CardTitle>Icon on the active tab</CardTitle>
          <CardDescription>
            Pass the icon through `icon`. Set `iconPinned` to keep it visible on
            an inactive tab, e.g. for a live spinner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs onValueChange={setTab} value={tab}>
            <IconTabsList aria-label="Webhook views" value={tab}>
              <IconTabsTrigger
                icon={<HugeiconsIcon icon={SentIcon} size={15} />}
                value="deliveries"
              >
                Deliveries
              </IconTabsTrigger>
              <IconTabsTrigger
                icon={<HugeiconsIcon icon={Link04Icon} size={15} />}
                value="endpoints"
              >
                Endpoints
                <Badge size="sm" variant="secondary">
                  3
                </Badge>
              </IconTabsTrigger>
              <IconTabsTrigger
                icon={
                  <HugeiconsIcon
                    className="text-primary motion-safe:animate-spin"
                    icon={ArrowReloadHorizontalIcon}
                    size={15}
                  />
                }
                iconPinned
                value="syncing"
              >
                Syncing
              </IconTabsTrigger>
            </IconTabsList>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
