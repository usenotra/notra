export type LocalDevAuthBlockReason = "missing_email" | "non_loopback";

export type LocalDevAuthDecision =
  | { kind: "disabled" }
  | { kind: "allowed" }
  | { kind: "blocked"; reason: LocalDevAuthBlockReason };
