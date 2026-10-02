import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { PromptOutcomeIcon } from "@notra/ui/components/geo/prompt-outcome-icon";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";

import { DeferredAnswerDemo } from "@/components/landing/deferred-answer-demo";
import {
  ANSWER_EXAMPLE_FACTS,
  ANSWER_EXAMPLE_HEADING,
  ANSWER_EXAMPLE_OUTCOME_LABELS,
  ANSWER_EXAMPLE_POSITION_CLASS,
  ANSWER_EXAMPLE_POSITION_NONE,
  ANSWER_EXAMPLE_PROMPT,
  ANSWER_EXAMPLE_RESULT_HEADERS,
  ANSWER_EXAMPLE_RESULTS,
  ANSWER_EXAMPLE_RESULTS_TITLE,
  ANSWER_EXAMPLE_SENTIMENT_CLASS,
  ANSWER_EXAMPLE_SENTIMENT_LABELS,
  ANSWER_EXAMPLE_SUBCOPY,
} from "@/constants/landing/answer-example";
import { GEO_ENGINE_NAMES } from "@/constants/landing/geo-engines";
import { answerPositionTone } from "@/utils/answer-example";

const HEADER_CLASS = "text-muted-foreground text-xs";

function ResultsTable() {
  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="text-foreground px-5 pt-4 pb-3 text-sm font-medium">
        {ANSWER_EXAMPLE_RESULTS_TITLE}
      </div>
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className={HEADER_CLASS}>
              {ANSWER_EXAMPLE_RESULT_HEADERS.engine}
            </TableHead>
            <TableHead className={HEADER_CLASS}>
              {ANSWER_EXAMPLE_RESULT_HEADERS.mentioned}
            </TableHead>
            <TableHead className={HEADER_CLASS}>
              {ANSWER_EXAMPLE_RESULT_HEADERS.position}
            </TableHead>
            <TableHead className={HEADER_CLASS}>
              {ANSWER_EXAMPLE_RESULT_HEADERS.sentiment}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ANSWER_EXAMPLE_RESULTS.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="py-3">
                <span className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                  <EngineIcon engine={row.id} />
                  {GEO_ENGINE_NAMES[row.id]}
                </span>
              </TableCell>
              <TableCell className="py-3">
                <span
                  aria-label={
                    row.mentioned
                      ? ANSWER_EXAMPLE_OUTCOME_LABELS.mentioned
                      : ANSWER_EXAMPLE_OUTCOME_LABELS.notMentioned
                  }
                  className="inline-flex items-center"
                  role="img"
                >
                  <PromptOutcomeIcon mentioned={row.mentioned} />
                </span>
              </TableCell>
              <TableCell className="py-3">
                {row.position === null ? (
                  <span className="text-muted-foreground text-sm">
                    {ANSWER_EXAMPLE_POSITION_NONE}
                  </span>
                ) : (
                  <Badge
                    className={cn(
                      "rounded-sm tabular-nums",
                      ANSWER_EXAMPLE_POSITION_CLASS[
                        answerPositionTone(row.position)
                      ]
                    )}
                    variant="outline"
                  >
                    #{row.position}
                  </Badge>
                )}
              </TableCell>
              <TableCell
                className={cn(
                  "py-3 text-sm",
                  ANSWER_EXAMPLE_SENTIMENT_CLASS[row.sentiment]
                )}
              >
                {ANSWER_EXAMPLE_SENTIMENT_LABELS[row.sentiment]}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AnswerExampleSection() {
  return (
    <section className="mx-auto flex w-full max-w-360 flex-col items-center px-6 pt-24 antialiased [font-synthesis:none] sm:px-12 lg:px-20 lg:pt-40">
      <div className="flex w-full flex-col items-center gap-12 lg:gap-16">
        <header className="flex flex-col items-center gap-4">
          <h2 className="font-display max-w-[44rem] text-center text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-black sm:text-[2.25rem] lg:text-[3.0625rem]/14 dark:text-white">
            {ANSWER_EXAMPLE_HEADING}
          </h2>
          <p className="font-display w-full max-w-[44rem] text-center text-lg/7 font-medium tracking-[-0.01em] text-balance text-[#1E1E1EBF] sm:text-xl/7.5 dark:text-white/70">
            {ANSWER_EXAMPLE_SUBCOPY}
          </p>
        </header>
        <div className="grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
          <DeferredAnswerDemo>
            <div className="border-border bg-background h-[40rem] overflow-hidden rounded-2xl border px-6 py-5">
              <p className="text-xl font-semibold">{ANSWER_EXAMPLE_PROMPT}</p>
              <p className="text-muted-foreground mt-8">
                {ANSWER_EXAMPLE_RESULTS[0]?.excerpt.split("\n\n")[0]}
              </p>
            </div>
          </DeferredAnswerDemo>
          <div className="flex flex-col gap-8">
            <ResultsTable />
            <ul className="flex flex-col gap-5">
              {ANSWER_EXAMPLE_FACTS.map((fact) => (
                <li className="flex flex-col gap-1" key={fact.id}>
                  <span className="font-sans text-base font-medium text-[#0A0D14] dark:text-white">
                    {fact.title}
                  </span>
                  <span className="font-sans text-[0.9375rem]/6 text-[#6A6B70] dark:text-white/60">
                    {fact.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
