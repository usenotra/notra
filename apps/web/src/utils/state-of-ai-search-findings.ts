import type { StateOfAiSearchReport } from "@/types/state-of-ai-search";

/** Three to five plain-language takeaways, all derived from the report data. */
export function buildReportFindings(report: StateOfAiSearchReport): string[] {
  const findings: string[] = [];
  const [leader, runnerUp] = report.ranking;
  if (leader && runnerUp) {
    const gap = leader.visibility - runnerUp.visibility;
    findings.push(
      gap <= 5
        ? `${leader.name} and ${runnerUp.name} are neck and neck: ${leader.visibility}% and ${runnerUp.visibility}% of answers name them.`
        : `${leader.name} leads with ${leader.visibility}% visibility, ${gap} points ahead of ${runnerUp.name}.`
    );
  }

  const topPicker = report.ranking.toSorted((a, b) => b.topPick - a.topPick)[0];
  if (topPicker && topPicker.topPick > 0) {
    findings.push(
      topPicker.name === leader?.name
        ? `${topPicker.name} is also named first most often, in ${topPicker.topPick}% of answers.`
        : `${topPicker.name} is named first most often (${topPicker.topPick}% of answers), even though ${leader?.name} is mentioned more.`
    );
  }

  const byBrands = report.engines.toSorted(
    (a, b) => b.brandsPerAnswer - a.brandsPerAnswer
  );
  const widest = byBrands[0];
  const narrowest = byBrands.at(-1);
  if (widest && narrowest && widest.id !== narrowest.id) {
    findings.push(
      `${widest.label} names ${widest.brandsPerAnswer} tracked brands per answer, ${narrowest.label} only ${narrowest.brandsPerAnswer}.`
    );
  }

  findings.push(
    `The assistants agree on the brand to name first for ${report.totals.consensus}% of prompts.`
  );

  const overviews = report.engines.find(
    (engine) => engine.id === "ai-overview"
  );
  if (overviews) {
    findings.push(
      `Google showed an AI Overview for ${report.totals.aiOverviewShown}% of the prompts.`
    );
  }

  return findings;
}
