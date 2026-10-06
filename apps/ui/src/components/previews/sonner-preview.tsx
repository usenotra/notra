import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

const TOAST_CLASS =
  "flex w-64 items-center gap-2.5 rounded-[0.875rem] border border-border bg-linear-to-b from-background to-muted/60 p-3 text-sm text-popover-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.14)] [corner-shape:squircle] dark:border-input dark:from-input dark:to-muted dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_-8px_rgba(0,0,0,0.6)]";
const CHIP_CLASS =
  "flex size-6 shrink-0 items-center justify-center rounded-lg [corner-shape:squircle] [&_svg]:size-3.5";

export default function SonnerPreview() {
  return (
    <div className="flex flex-col gap-2 self-center pb-6">
      <div className={TOAST_CLASS}>
        <span
          className={`${CHIP_CLASS} bg-[oklch(0.55_0.109_155)]/12 text-[oklch(0.55_0.109_155)]`}
        >
          <CircleCheckIcon />
        </span>
        <span className="font-medium">Deployment complete</span>
      </div>
      <div className={TOAST_CLASS}>
        <span
          className={`${CHIP_CLASS} bg-[oklch(0.57_0.113_55)]/12 text-[oklch(0.57_0.113_55)]`}
        >
          <TriangleAlertIcon />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Seat limit almost reached</span>
          <span className="text-muted-foreground text-[0.8rem]">
            9 of 10 seats are in use.
          </span>
        </span>
      </div>
    </div>
  );
}
