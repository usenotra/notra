import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../messages/en.json";
import { SiteDeploymentTimeline } from "../src/components/sites/site-deployment-timeline";
import type { SiteDeploymentRecord } from "../src/types/sites";

test.each([
  ["ready", "complete", "text-geo-up"],
  ["building", "active", "text-warning"],
  ["failed", "failed", "text-destructive"],
  ["canceled", "stopped", "text-warning"],
  ["superseded", "stopped", "text-warning"],
] as const)("%s colors only the entered phase", (status, state, color) => {
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <SiteDeploymentTimeline
        deployment={
          {
            status,
            createdAt: new Date("2026-10-07T12:00:00Z"),
            startedAt: new Date("2026-10-07T12:00:02Z"),
            finishedAt:
              status === "building" ? null : new Date("2026-10-07T12:00:14Z"),
          } as SiteDeploymentRecord
        }
        log={[
          "[deployment:preparing] 2026-10-07T12:00:02.000Z",
          "[deployment:building] 2026-10-07T12:00:03.000Z",
        ].join("\n")}
      />
    </IntlProvider>
  );

  const phases = [...html.matchAll(/<li\b[\s\S]*?<\/li>/g)].map(
    (match) => match[0]
  );
  expect(phases).toHaveLength(4);
  expect(phases[0]).toContain('data-state="complete"');
  expect(phases[0]).toContain("border-geo-up/30 bg-geo-up/5 text-geo-up");
  expect(phases[2]).toContain(`data-state="${state}"`);
  expect(phases[2]).toContain(color);
  expect(phases[3]).toContain(
    `data-state="${status === "ready" ? "unknown" : "pending"}"`
  );
  expect(phases[3]).not.toMatch(/border-(geo-up|warning|destructive)\//);
  for (const phase of phases) {
    expect(phase).toContain("before:bg-[repeating-linear-gradient(");
    expect(phase).toContain("before:pointer-events-none");
    expect(phase).toContain("inset-shadow-sm inset-shadow-white/15");
  }
  if (status === "building") {
    expect(phases[2]).toContain('aria-current="step"');
  }
});
