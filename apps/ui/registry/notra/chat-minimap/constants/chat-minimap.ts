export const CHAT_MINIMAP_VISIBLE_TURNS = 3;

export const CHAT_MINIMAP_DEMO_TURNS = [
  {
    description:
      "Add a rail that shows how long the conversation is, with one line per turn.",
    title: "Add a conversation minimap",
  },
  {
    description:
      "Lines grow on hover and each one opens a preview card beside the rail.",
    title: "Make the lines grow on hover",
  },
  {
    description: "The up and down buttons only show while they are hovered.",
    title: "Hide the arrows until hover",
  },
  {
    description:
      "The dither sphere was cut off on a straight line at its bottom and left edge.",
    title: "The background dither is messed up, fix pls",
  },
  {
    description: "Keep the card on the right by default and allow the left.",
    title: "Let the card open on either side",
  },
  {
    description: "Use shadcn Button, Card, HoverCard and Tooltip underneath.",
    title: "Build it from shadcn primitives",
  },
  {
    description: "Register the component and write a docs page for it.",
    title: "Add it to the registry",
  },
] as const;
