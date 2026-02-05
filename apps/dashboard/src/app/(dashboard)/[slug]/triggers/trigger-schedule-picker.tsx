"use client";

import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import type { CronFrequency } from "@/utils/schemas/integrations";

interface ScheduleValue {
  frequency: CronFrequency;
  hour: number;
  minute: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

interface SchedulePickerProps {
  value?: ScheduleValue;
  onChange: (value?: ScheduleValue) => void;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const current = value ?? { frequency: "daily", hour: 9, minute: 0 };

  const update = (updates: Partial<ScheduleValue>) => {
    onChange({ ...current, ...updates });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="font-medium text-sm">Schedule</p>
        <Select
          onValueChange={(val) => {
            if (val) {
              update({ frequency: val as CronFrequency });
            }
          }}
          value={current.frequency}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Frequency">
              {
                FREQUENCY_OPTIONS.find((o) => o.value === current.frequency)
                  ?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr]">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Hour (UTC)</p>
          <Select
            onValueChange={(val) => {
              if (val) {
                update({ hour: Number.parseInt(val, 10) });
              }
            }}
            value={String(current.hour)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {pad(hour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Minute (UTC)</p>
          <Select
            onValueChange={(val) => {
              if (val) {
                update({ minute: Number.parseInt(val, 10) });
              }
            }}
            value={String(current.minute)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Minute" />
            </SelectTrigger>
            <SelectContent>
              {MINUTES.map((minute) => (
                <SelectItem key={minute} value={String(minute)}>
                  {pad(minute)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {current.frequency === "weekly" ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">Day of week</p>
            <Select
              onValueChange={(val) => {
                if (val) {
                  update({ dayOfWeek: Number.parseInt(val, 10) });
                }
              }}
              value={String(current.dayOfWeek ?? 1)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {current.frequency === "monthly" ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">Day of month</p>
            <Select
              onValueChange={(val) => {
                if (val) {
                  update({ dayOfMonth: Number.parseInt(val, 10) });
                }
              }}
              value={String(current.dayOfMonth ?? 1)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_MONTH.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <Input
        className="text-xs"
        disabled
        value={`Timezone: UTC · ${FREQUENCY_OPTIONS.find((o) => o.value === current.frequency)?.label ?? current.frequency}`}
      />
    </div>
  );
}
