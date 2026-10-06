export const COMPOSER_TRAY_TRANSITION =
  "transition-[background-color,padding] duration-normal ease-emphasized motion-reduce:transition-none";

export const COMPOSER_NUDGE_ENTER =
  "transition-[opacity,transform] duration-normal ease-emphasized starting:opacity-0 starting:-translate-y-1 motion-reduce:starting:translate-y-0 motion-reduce:starting:opacity-100";

export const COMPOSER_TOOLBAR_BUTTON =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

export const COMPOSER_SEND_BUTTON =
  "flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-[background-color,color,transform] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.96]";

export const COMPOSER_CHIP_ACTION =
  "flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
