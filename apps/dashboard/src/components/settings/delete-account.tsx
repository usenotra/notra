"use client";

import { TitleCard } from "@notra/ui/components/ui/title-card";

import { Button } from "@/components/button";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export function DeleteAccountSection() {
  return (
    <TitleCard
      className="border-destructive/50 bg-destructive/5 lg:col-span-2"
      heading="Delete Account"
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Permanently remove your Personal Account and all of its contents from
          the Notra platform. This action is not reversible, so please continue
          with caution.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <DeleteAccountDialog
            trigger={
              <Button className="w-full sm:w-auto" variant="destructive">
                Delete Personal Account
              </Button>
            }
          />
        </div>
      </div>
    </TitleCard>
  );
}
