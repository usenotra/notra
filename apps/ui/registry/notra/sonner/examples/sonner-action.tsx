"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export default function SonnerActionExample() {
  return (
    <div className="flex min-h-64 w-full flex-wrap content-start items-center justify-center gap-3 p-6">
      <Button
        onClick={() =>
          toast("Post moved to trash", {
            action: {
              label: "Undo",
              onClick: () => toast.success("Post restored"),
            },
          })
        }
        variant="outline"
      >
        With action
      </Button>
      <Button
        onClick={() =>
          toast.error("Couldn't change role", {
            cancel: { label: "Dismiss", onClick: () => undefined },
            description: "Your plan includes 3 team members.",
          })
        }
        variant="outline"
      >
        With cancel
      </Button>
      <Toaster position="bottom-center" />
    </div>
  );
}
