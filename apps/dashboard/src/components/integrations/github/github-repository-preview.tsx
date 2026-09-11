import { Folder01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function GitHubRepositoryPreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto w-full max-w-sm [mask-image:linear-gradient(to_bottom,black_45%,transparent)] px-4 pt-4 select-none"
    >
      <div className="bg-background rounded-xl border shadow-sm">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
            <HugeiconsIcon
              className="text-muted-foreground size-4"
              icon={Folder01Icon}
            />
          </div>
          <div className="space-y-2">
            <div className="bg-foreground/15 h-2 w-28 rounded-full" />
            <div className="bg-foreground/5 h-1.5 w-16 rounded-full" />
          </div>
          <div className="bg-primary/10 ml-auto h-5 w-14 rounded-full" />
        </div>
        <div className="space-y-4 px-4 py-4">
          {["Changelog", "Blog posts"].map((label) => (
            <div className="flex items-center gap-3" key={label}>
              <div className="bg-primary/25 flex h-4 w-7 shrink-0 items-center justify-end rounded-full px-0.5">
                <div className="bg-background size-3 rounded-full shadow-sm" />
              </div>
              <span className="text-muted-foreground text-xs">{label}</span>
              <div className="ml-auto flex h-6 w-24 items-center gap-2 rounded-md border px-2">
                <HugeiconsIcon
                  className="text-muted-foreground size-3"
                  icon={Folder01Icon}
                />
                <div className="bg-foreground/10 h-1.5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
