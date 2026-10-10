export const COST_USAGE = { inputTokens: 1000, outputTokens: 100 };
export const COST_PRICE = { input: 0.000001, output: 0.000002 };

export const COST_FIXTURES = [
  {
    name: "reported zero with market cost",
    steps: [
      {
        usage: COST_USAGE,
        providerMetadata: { gateway: { cost: "0", marketCost: "0.5" } },
      },
    ],
    price: COST_PRICE,
    baseline: 0.5,
    candidate: 0,
    reported: 0,
    source: "reported",
  },
  {
    name: "reported zero without market cost",
    steps: [{ usage: COST_USAGE, providerMetadata: { gateway: { cost: 0 } } }],
    price: COST_PRICE,
    baseline: 0.0012,
    candidate: 0,
    reported: 0,
    source: "reported",
  },
  {
    name: "market-only metadata is estimated, not reported",
    steps: [
      { usage: COST_USAGE, providerMetadata: { gateway: { marketCost: 0.5 } } },
    ],
    price: COST_PRICE,
    baseline: 0.5,
    candidate: 0.0012,
    reported: 0,
    source: "estimated",
  },
  {
    name: "missing step keeps the other step's reported bill",
    steps: [
      { usage: COST_USAGE, providerMetadata: { gateway: { cost: 0.003 } } },
      { usage: COST_USAGE },
    ],
    price: COST_PRICE,
    baseline: 0.0024,
    candidate: 0.0042,
    reported: 0.003,
    source: "mixed",
  },
  {
    name: "unknown-priced missing step never exposes a partial total",
    steps: [
      { usage: COST_USAGE, providerMetadata: { gateway: { cost: 0.003 } } },
      { usage: COST_USAGE },
    ],
    price: undefined,
    baseline: undefined,
    candidate: undefined,
    reported: 0.003,
    source: "unknown",
  },
  {
    name: "unknown-priced market-only call is unknown, not a market bill",
    steps: [
      { usage: COST_USAGE, providerMetadata: { gateway: { marketCost: 0.5 } } },
    ],
    price: undefined,
    baseline: 0.5,
    candidate: undefined,
    reported: 0,
    source: "unknown",
  },
] as const;
