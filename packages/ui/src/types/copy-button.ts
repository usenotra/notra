import type { ButtonProps } from "@notra/ui/components/ui/button";
import type { ReactNode } from "react";

/** Why a copy failed: no Clipboard API, or the browser rejected the write. */
export type CopyToClipboardErrorReason = "unsupported" | "failed";

export interface UseCopyToClipboardOptions {
  /** How long `copied` stays true after a successful copy, in ms. */
  timeout?: number;
  onError?: (reason: CopyToClipboardErrorReason, error?: unknown) => void;
}

export interface UseCopyToClipboardResult {
  copied: boolean;
  /** The text of the last successful copy while `copied` is true. Compare it
   with the current value so a changed value doesn't keep showing copied. */
  copiedText: string | null;
  /** Writes `text` to the clipboard. Resolves `true` once it landed. */
  copy: (text: string) => Promise<boolean>;
}

export interface CopyStateIconProps {
  copied: boolean;
  className?: string;
  /** Applied to both icons, e.g. `size-3` to override the icon size. */
  iconClassName?: string;
  /** Colours the tick with the success token. Turn off on filled buttons. */
  tinted?: boolean;
}

export type CopyButtonProps = Omit<ButtonProps, "value" | "onCopy"> & {
  /** Text written to the clipboard. */
  value: string;
  /** Runs after the text landed on the clipboard. */
  onCopy?: () => void;
  onCopyError?: (reason: CopyToClipboardErrorReason, error?: unknown) => void;
  /** How long the copied state stays, in ms. */
  timeout?: number;
  /** Label shown in place of `children` while copied. */
  copiedLabel?: ReactNode;
  /** Accessible name of an icon-only button while copied. */
  copiedAriaLabel?: string;
  /** Applied to both icons, e.g. `size-3.5` to override the icon size. */
  iconClassName?: string;
};

export type CopyButtonClickHandler = NonNullable<ButtonProps["onClick"]>;
