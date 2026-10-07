export const CHAT_MINIMAP_VISIBLE_TURNS = 3;

const CHAT_MINIMAP_TURN_COPY = [
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

export const CHAT_MINIMAP_LONG_TURN_COUNT = 50;

export const CHAT_MINIMAP_DEMO_TURNS = CHAT_MINIMAP_TURN_COPY.map(
  (turn, index) => ({ ...turn, id: `turn-${index + 1}` })
);

export const CHAT_MINIMAP_LONG_TURNS = Array.from(
  { length: CHAT_MINIMAP_LONG_TURN_COUNT },
  (_, index) => ({
    ...CHAT_MINIMAP_TURN_COPY[index % CHAT_MINIMAP_TURN_COPY.length],
    id: `long-turn-${index + 1}`,
  })
);
