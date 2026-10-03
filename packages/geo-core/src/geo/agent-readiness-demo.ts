import { Effect, Layer } from "effect";

import { GEO_DEMO_AGENT_READINESS_REPORT } from "../constants/geo-demo";
import { AgentReadinessNetwork } from "../deps";

/**
 * Agent readiness for the public demo: scans finish instantly with a canned
 * report instead of calling the is-agentic API for a fictional domain.
 */
export const agentReadinessNetworkDemo = Layer.succeed(
  AgentReadinessNetwork,
  AgentReadinessNetwork.of({
    report: Effect.fn("AgentReadinessDemo.report")(() =>
      Effect.succeed({
        ...GEO_DEMO_AGENT_READINESS_REPORT,
        scannedAt: new Date(),
      })
    ),
    scan: Effect.fn("AgentReadinessDemo.scan")(() => Effect.void),
    feedback: Effect.fn("AgentReadinessDemo.feedback")(() =>
      Effect.succeed(null)
    ),
  })
);
