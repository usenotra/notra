"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import {
  isTeamMemberLimitError,
  mapBillingLimitErrorMessage,
} from "@/lib/billing/limits";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import { cn } from "@/lib/utils";
import type { InviteMemberPopoverProps } from "@/types/settings/members";

const INVITE_ROLES = ["member", "admin"] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

export function InviteMemberPopover({
  organizationId,
}: InviteMemberPopoverProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const queryClient = useQueryClient();
  const { openSettings } = useSettingsModal();

  const reset = () => {
    setEmail("");
    setRole("member");
  };

  const { mutate: inviteMember, isPending } = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.inviteMember({
        email: email.trim(),
        role,
        organizationId,
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      setOpen(false);
      reset();
      queryClient.invalidateQueries({
        queryKey: ["invitations", organizationId],
      });
    },
    onError: (error) => {
      const message = mapBillingLimitErrorMessage(
        error.message,
        "Failed to send invitation"
      );
      if (isTeamMemberLimitError(error.message)) {
        toast.error(message, {
          action: {
            label: "View plans",
            onClick: () => openSettings("billing"),
          },
        });
        return;
      }
      toast.error(message);
    },
  });

  const canSubmit = email.trim().length > 0 && !isPending;

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
      open={open}
    >
      <PopoverTrigger
        render={
          <Button size="sm">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Invite Member
          </Button>
        }
      />
      <PopoverContent
        align="end"
        className="z-[60] w-80 gap-3 p-3"
        side="bottom"
      >
        <PopoverHeader>
          <PopoverTitle>Invite member</PopoverTitle>
          <PopoverDescription>
            They'll get an email invitation to join this organization.
          </PopoverDescription>
        </PopoverHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) {
              return;
            }
            inviteMember();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              autoComplete="email"
              autoFocus
              id="invite-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="member@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <div
              aria-label="Role"
              className="bg-muted grid grid-cols-2 rounded-lg p-[3px]"
              id="invite-role"
              role="radiogroup"
            >
              {INVITE_ROLES.map((value) => {
                const selected = role === value;
                return (
                  <button
                    aria-checked={selected}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                      selected
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    key={value}
                    onClick={() => setRole(value)}
                    role="radio"
                    type="button"
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-0.5">
            <Button
              disabled={isPending}
              onClick={() => setOpen(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={!canSubmit} size="sm" type="submit">
              {isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
