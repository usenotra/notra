"use client";

import {
  GEO_SHELF_NOTES_MAX_LENGTH,
  GEO_SHELF_OPPORTUNITY_STATUSES,
  GEO_SHELF_PRIORITIES,
} from "@notra/schemas/constants/dashboard/geo-shelf";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useEffect, useId, useRef, useState } from "react";

import { ShelfDueDateField } from "@/components/geo/shelf/shelf-due-date-field";
import { ShelfMemberSelect } from "@/components/geo/shelf/shelf-member-select";
import { ShelfTicketMark } from "@/components/geo/shelf/shelf-ticket-badge";
import {
  GEO_SHELF_NO_PRIORITY,
  GEO_SHELF_NOTES_SAVE_DEBOUNCE_MS,
  GEO_SHELF_PRIORITY_LABELS,
} from "@/constants/geo-shelf";
import type {
  GeoShelfOpportunityStatus,
  GeoShelfPriority,
  GeoShelfTicketFormProps,
} from "@/types/geo-shelf";

function toStatus(value: string): GeoShelfOpportunityStatus {
  return (
    GEO_SHELF_OPPORTUNITY_STATUSES.find((status) => status === value) ?? "open"
  );
}

function toPriority(value: string): GeoShelfPriority | null {
  return GEO_SHELF_PRIORITIES.find((priority) => priority === value) ?? null;
}

function toNotesWrite(value: string): string | null {
  return value.length > 0 ? value : null;
}

function persistNotesIfChanged(
  value: string,
  savedNotesRef: { current: string | null },
  onChangeRef: { current: GeoShelfTicketFormProps["onChange"] }
) {
  const next = toNotesWrite(value);
  if (next === savedNotesRef.current) {
    return;
  }
  savedNotesRef.current = next;
  onChangeRef.current({ notes: next });
}

export function ShelfTicketForm({
  opportunity,
  members,
  currentMemberId,
  onChange,
  disabled,
}: GeoShelfTicketFormProps) {
  const id = useId();
  const status = opportunity?.status ?? "open";
  const priority = opportunity?.priority ?? null;
  const assigneeMemberId = opportunity?.assigneeMemberId ?? null;
  const pocMemberId = opportunity?.pocMemberId ?? null;
  const savedNotes = opportunity?.notes ?? null;
  const dueAt = opportunity?.dueAt ?? null;
  const [draftNotes, setDraftNotes] = useState(savedNotes ?? "");
  const draftNotesRef = useRef(draftNotes);
  const savedNotesRef = useRef(savedNotes);
  const onChangeRef = useRef(onChange);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    savedNotesRef.current = savedNotes;
  }, [savedNotes]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      persistNotesIfChanged(draftNotesRef.current, savedNotesRef, onChangeRef);
    },
    []
  );

  const flushNotes = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    persistNotesIfChanged(draftNotesRef.current, savedNotesRef, onChangeRef);
  };

  const handleNotesChange = (value: string) => {
    draftNotesRef.current = value;
    setDraftNotes(value);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      persistNotesIfChanged(value, savedNotesRef, onChangeRef);
    }, GEO_SHELF_NOTES_SAVE_DEBOUNCE_MS);
  };

  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${id}-status`}>Status</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ status: toStatus(value ?? "open") })
          }
          value={status}
        >
          <SelectTrigger className="w-full" id={`${id}-status`}>
            <SelectValue>
              <ShelfTicketMark status={status} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GEO_SHELF_OPPORTUNITY_STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                <ShelfTicketMark status={option} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-priority`}>Priority</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ priority: toPriority(value ?? GEO_SHELF_NO_PRIORITY) })
          }
          value={priority ?? GEO_SHELF_NO_PRIORITY}
        >
          <SelectTrigger className="w-full" id={`${id}-priority`}>
            <SelectValue>
              {priority ? GEO_SHELF_PRIORITY_LABELS[priority] : "No priority"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GEO_SHELF_NO_PRIORITY}>No priority</SelectItem>
            {GEO_SHELF_PRIORITIES.map((option) => (
              <SelectItem key={option} value={option}>
                {GEO_SHELF_PRIORITY_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <span className="flex items-center justify-between">
          <Label htmlFor={`${id}-assignee`}>Assignee</Label>
          {currentMemberId && assigneeMemberId !== currentMemberId ? (
            <button
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              disabled={disabled}
              onClick={() => onChange({ assigneeMemberId: currentMemberId })}
              type="button"
            >
              Assign to me
            </button>
          ) : null}
        </span>
        <ShelfMemberSelect
          ariaLabel="Assignee"
          disabled={disabled}
          id={`${id}-assignee`}
          members={members}
          onChange={(memberId) => onChange({ assigneeMemberId: memberId })}
          value={assigneeMemberId}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-poc`}>Point of contact</Label>
        <ShelfMemberSelect
          allowSameAsAssignee
          ariaLabel="Point of contact"
          disabled={disabled}
          id={`${id}-poc`}
          members={members}
          onChange={(memberId) => onChange({ pocMemberId: memberId })}
          value={pocMemberId}
        />
      </div>
      <ShelfDueDateField
        disabled={disabled}
        dueAt={dueAt}
        id={`${id}-due`}
        onChange={(nextDueAt) => onChange({ dueAt: nextDueAt })}
      />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${id}-notes`}>Notes</Label>
        <Textarea
          id={`${id}-notes`}
          maxLength={GEO_SHELF_NOTES_MAX_LENGTH}
          onBlur={flushNotes}
          onChange={(event) => {
            handleNotesChange(event.target.value);
          }}
          placeholder="Who you contacted, what they said, what happens next"
          rows={3}
          value={draftNotes}
        />
      </div>
    </div>
  );
}
