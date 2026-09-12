"use client";

import {
  ArrowUpRight01Icon,
  Copy01Icon,
  UserAdd01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_SHELF_OPPORTUNITY_STATUSES,
  GEO_SHELF_PLACEMENT_STATUSES,
} from "@notra/schemas/constants/dashboard/geo-shelf";
import { isAllowedShelfUrl } from "@notra/schemas/utils/dashboard/shelf-url";
import {
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@notra/ui/components/ui/context-menu";

import { ShelfPlacementMark } from "@/components/geo/shelf/shelf-placement-badge";
import { ShelfTicketMark } from "@/components/geo/shelf/shelf-ticket-badge";
import {
  GEO_SHELF_OPPORTUNITY_STATUS_LABELS,
  GEO_SHELF_PLACEMENT_LABELS,
} from "@/constants/geo-shelf";
import type {
  GeoShelfOpportunityStatus,
  GeoShelfPlacementStatus,
  GeoShelfTableContextMenuProps,
} from "@/types/geo-shelf";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

function toTicketStatus(value: string): GeoShelfOpportunityStatus {
  return (
    GEO_SHELF_OPPORTUNITY_STATUSES.find((status) => status === value) ?? "open"
  );
}

function toPlacementStatus(value: string): GeoShelfPlacementStatus {
  return (
    GEO_SHELF_PLACEMENT_STATUSES.find((status) => status === value) ?? "unknown"
  );
}

export function ShelfTableContextMenu({
  row,
  currentMemberId,
  disabled,
  onOpenDetails,
  onUpdateOpportunity,
  onSetPlacementStatus,
}: GeoShelfTableContextMenuProps) {
  const ticketStatus = row.opportunity?.status;
  const placementStatus = row.ownPlacement?.status ?? "unknown";
  const canOpenPage = isAllowedShelfUrl(row.url);
  const canAssign =
    currentMemberId !== null &&
    row.opportunity?.assigneeMemberId !== currentMemberId;

  return (
    <>
      <ContextMenuItem onClick={() => onOpenDetails(row)}>
        <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
        Open details
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!canOpenPage}
        onClick={() => {
          window.open(row.url, "_blank", "noopener,noreferrer");
        }}
      >
        <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} />
        Open page
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => copyTextToClipboard(row.url, "Copied URL")}
      >
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
        Copy URL
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger
          className="[&_svg]:ml-0"
          disabled={disabled}
          openOnHover
        >
          Ticket
          <span className="text-muted-foreground ml-auto">
            {ticketStatus
              ? GEO_SHELF_OPPORTUNITY_STATUS_LABELS[ticketStatus]
              : "No ticket"}
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuRadioGroup
            onValueChange={(value) => {
              const status = toTicketStatus(String(value));
              if (status === ticketStatus) {
                return;
              }
              onUpdateOpportunity(row.id, {
                status,
                ...(row.opportunity
                  ? {}
                  : { assigneeMemberId: currentMemberId }),
              });
            }}
            value={ticketStatus}
          >
            {GEO_SHELF_OPPORTUNITY_STATUSES.map((status) => (
              <ContextMenuRadioItem key={status} value={status}>
                <ShelfTicketMark status={status} />
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>
      {row.ownPlacement ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger
            className="[&_svg]:ml-0"
            disabled={disabled}
            openOnHover
          >
            You
            <span className="text-muted-foreground ml-auto">
              {GEO_SHELF_PLACEMENT_LABELS[placementStatus]}
            </span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              onValueChange={(value) => {
                const status = toPlacementStatus(String(value));
                if (status === placementStatus) {
                  return;
                }
                onSetPlacementStatus(row.id, null, status);
              }}
              value={placementStatus}
            >
              {GEO_SHELF_PLACEMENT_STATUSES.map((status) => (
                <ContextMenuRadioItem key={status} value={status}>
                  <ShelfPlacementMark status={status} />
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      ) : null}
      {canAssign ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={disabled}
            onClick={() =>
              onUpdateOpportunity(row.id, {
                assigneeMemberId: currentMemberId,
                ...(row.opportunity ? {} : { status: "open" }),
              })
            }
          >
            <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} />
            Assign to me
          </ContextMenuItem>
        </>
      ) : null}
    </>
  );
}
