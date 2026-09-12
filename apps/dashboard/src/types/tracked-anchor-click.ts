export type ModifiedClickEvent = {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type TrackedAnchorClickEvent = ModifiedClickEvent & {
  currentTarget: { href: string };
  preventDefault: () => void;
};
