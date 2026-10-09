/** Checks built reports against the additive raw cache. No paid requests. */
import { strict as assert } from "node:assert";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  StateOfAiSearchReport,
  StateOfAiSearchSummary,
} from "../../../../apps/web/src/types/state-of-ai-search";
import { REPORT_CATEGORIES } from "./categories";
import { RAW_ROOT, REPORT_EDITION, type RawAnswer } from "./shared";
import { brandMatchers, firstMention } from "./utils/brand-matching";

const engines = [
  "chatgpt",
  "claude",
  "gemini",
  "perplexity",
  "ai-overview",
] as const;
const outputRoot = join(
  import.meta.dir,
  "../../../../apps/web/src/content/state-of-ai-search"
);

for (const category of REPORT_CATEGORIES) {
  if (process.env.SOAS_ONLY && category.slug !== process.env.SOAS_ONLY) {
    continue;
  }
  const report = JSON.parse(
    await readFile(
      join(outputRoot, category.slug, `${REPORT_EDITION}.json`),
      "utf8"
    )
  ) as StateOfAiSearchReport;
  const summary = JSON.parse(
    await readFile(
      join(outputRoot, category.slug, `${REPORT_EDITION}.summary.json`),
      "utf8"
    )
  ) as StateOfAiSearchSummary;
  assert.deepEqual(summary.engines, report.engines);
  assert.deepEqual(summary.leaders, report.ranking.slice(0, 5));
  assert.equal(report.totals.prompts, 20);
  assert.equal(report.totals.brands, 15);
  assert.deepEqual(
    report.engines.map((engine) => engine.id),
    engines
  );
  assert.equal(
    report.totals.answers,
    report.engines.reduce((sum, engine) => sum + engine.answers, 0)
  );
  assert.equal(
    report.totals.answers,
    report.prompts.reduce((sum, prompt) => sum + prompt.answers, 0)
  );
  for (const engine of report.engines) {
    assert.ok(engine.answers > 0);
    assert.ok(
      engine.brandsPerAnswer >= 0 &&
        engine.brandsPerAnswer <= category.brands.length
    );
    assert.ok(
      engine.sourcesPerAnswer >= 0 && Number.isFinite(engine.sourcesPerAnswer)
    );
    const directory = join(RAW_ROOT, REPORT_EDITION, category.slug, engine.id);
    const raw = await Promise.all(
      (await readdir(directory))
        .filter((name) => name.endsWith(".json"))
        .map(
          async (name) =>
            JSON.parse(
              await readFile(join(directory, name), "utf8")
            ) as RawAnswer
        )
    );
    assert.equal(engine.answers, raw.filter((answer) => answer.present).length);
    for (const answer of raw) {
      assert.equal(answer.prompt, category.prompts[answer.promptIndex]);
      assert.equal(answer.model, engine.model);
    }
  }
  for (const [index, brand] of report.ranking.entries()) {
    assert.equal(brand.rank, index + 1);
    const previous = report.ranking[index - 1];
    assert.ok(!previous || previous.visibility >= brand.visibility);
    for (const engine of engines) {
      const rate = brand.byEngine[engine];
      assert.ok(typeof rate === "number" && rate >= 0 && rate <= 100);
    }
    // Visibility averages unrounded engine rates; byEngine holds rounded
    // ones, so the two can differ by a point.
    const roundedMean =
      engines.reduce((sum, engine) => sum + (brand.byEngine[engine] ?? 0), 0) /
      engines.length;
    assert.ok(Math.abs(brand.visibility - roundedMean) <= 1);
    for (const rate of [brand.visibility, brand.topPick, brand.ownSiteCited]) {
      assert.ok(rate >= 0 && rate <= 100);
    }
  }
  for (const prompt of report.prompts) {
    for (const count of [
      ...Object.values(prompt.mentions),
      ...Object.values(prompt.firsts),
    ]) {
      assert.ok(count >= 0 && count <= prompt.answers);
    }
    assert.equal(prompt.responses.length, 4 + Number(prompt.aiOverviewShown));
    assert.ok(
      prompt.responses.every((answer) => Array.isArray(answer.searchQueries))
    );
  }
  for (const source of report.sources) {
    assert.ok(source.share >= 0 && source.share <= 100);
    for (const engine of engines) {
      const rate = source.byEngine[engine];
      assert.ok(typeof rate === "number" && rate >= 0 && rate <= 100);
    }
  }
  assert.ok(report.totals.consensus >= 0 && report.totals.consensus <= 100);
  assert.ok(
    report.totals.aiOverviewShown >= 0 && report.totals.aiOverviewShown <= 100
  );
  for (const brand of category.brands) {
    assert.ok(
      firstMention(
        `Recommended provider: ${brand.name}.`,
        brandMatchers(brand)
      ) >= 0
    );
  }
  for (const [name, phrase] of [
    ["Render", "render the page"],
    ["Neon", "neon lights"],
    ["Railway", "railway station"],
    ["Heroku", "herokuism"],
    ["Fly.io", "fly through these steps"],
    ["Loops", "loops over rows"],
    ["Clerk", "the clerk handles paperwork"],
    ["Amazon SES", "processes"],
    ["Amazon RDS", "aurora borealis"],
  ] as const) {
    const brand = category.brands.find((item) => item.name === name);
    if (brand) {
      assert.equal(firstMention(phrase, brandMatchers(brand)), -1);
    }
  }
  console.log(
    `${category.slug}: passed, ${report.totals.answers} answers, ${report.totals.consensus}% consensus`
  );
}
