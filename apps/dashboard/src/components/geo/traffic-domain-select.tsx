"use client";

import { GEO_TRAFFIC_HOST_ALL } from "@notra/geo-core/constants/geo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "use-intl";

import { useGeoTrafficHostQuery } from "@/lib/hooks/use-geo-traffic-host";
import type { TrafficDomainSelectProps } from "@/types/geo";
import {
  trafficHostSelectOptions,
  trafficHostSelectValue,
} from "@/utils/ai-traffic-pages";

export function TrafficDomainSelect({ hosts }: TrafficDomainSelectProps) {
  const t = useTranslations("geo.trafficPagesCard");
  const [hostQuery, setHostQuery] = useGeoTrafficHostQuery();
  const value = trafficHostSelectValue(hostQuery);
  const options = trafficHostSelectOptions(hosts, hostQuery);
  if (options.length < 2 && value === GEO_TRAFFIC_HOST_ALL) {
    return null;
  }
  return (
    <Select
      onValueChange={(next) => {
        if (next) {
          setHostQuery(next === GEO_TRAFFIC_HOST_ALL ? "" : next);
        }
      }}
      value={value}
    >
      <SelectTrigger
        aria-label={t("filterByDomain")}
        className="w-auto max-w-72 min-w-36"
        size="sm"
      >
        <SelectValue>
          {value === GEO_TRAFFIC_HOST_ALL ? t("allDomains") : value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={GEO_TRAFFIC_HOST_ALL}>{t("allDomains")}</SelectItem>
        {options.map((host) => (
          <SelectItem key={host} value={host}>
            {host}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
