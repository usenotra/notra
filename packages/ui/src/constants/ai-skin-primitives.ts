/**
 * The AI skins mimic other products pixel for pixel, so they strip the
 * defaults the shadcn primitives bring along before layering their own look.
 */

/**
 * Neutralises Button chrome: squircle corners, transparent border, medium
 * weight, press scale, disabled fade and the forced 16px icon size (icons keep
 * the size they were given).
 */
export const AI_SKIN_BUTTON_RESET =
  "corner-round border-0 bg-clip-border font-normal active:scale-100 data-disabled:opacity-100 [&_svg:not([class*='size-'])]:size-auto";

/**
 * Neutralises InputGroup chrome: fixed height, the focus ring around the whole
 * group and the fade when a child (e.g. an idle send button) is disabled.
 */
export const AI_SKIN_INPUT_GROUP_RESET =
  "h-auto has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:ring-0";

/** Neutralises InputGroupAddon chrome so it acts as a plain flex slot. */
export const AI_SKIN_INPUT_GROUP_ADDON_RESET =
  "cursor-auto p-0 font-normal text-inherit has-[>button]:mx-0";
