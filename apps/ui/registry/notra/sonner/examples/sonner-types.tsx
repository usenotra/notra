"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default function SonnerTypesExample() {
  return (
    <div className="flex min-h-80 w-full flex-wrap content-start items-center justify-center gap-3 p-6">
      <Button onClick={() => toast("Workspace synced")} variant="outline">
        Default
      </Button>
      <Button
        onClick={() => toast.success("Deployment complete")}
        variant="outline"
      >
        Success
      </Button>
      <Button
        onClick={() =>
          toast.info("New scan scheduled", {
            description: "Runs every Monday at 09:00.",
          })
        }
        variant="outline"
      >
        Info
      </Button>
      <Button
        onClick={() =>
          toast.warning("Seat limit almost reached", {
            description: "9 of 10 seats are in use.",
          })
        }
        variant="outline"
      >
        Warning
      </Button>
      <Button
        onClick={() => toast.error("Something went wrong")}
        variant="outline"
      >
        Error
      </Button>
      <Button
        onClick={() => {
          const id = toast.loading("Publishing changelog...");
          setTimeout(() => toast.success("Changelog published", { id }), 2000);
        }}
        variant="outline"
      >
        Loading
      </Button>
      <Toaster position="bottom-center" />
    </div>
  );
}
