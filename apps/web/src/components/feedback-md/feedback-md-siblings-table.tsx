import { cn } from "@notra/ui/lib/utils";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/marketing-table";
import { FEEDBACK_MD_SIBLINGS } from "@/lib/feedback-md/constants";

export function FeedbackMdSiblingsTable() {
  return (
    <div className="border-border/70 overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-5">File</TableHead>
            <TableHead>Answers</TableHead>
            <TableHead className="pr-5">Direction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FEEDBACK_MD_SIBLINGS.map((sibling) => {
            const isFeedback = sibling.direction === "agent to site";
            return (
              <TableRow
                className={cn(isFeedback && "bg-primary/5 hover:bg-primary/5")}
                key={sibling.file}
              >
                <TableCell className="px-5 font-mono text-[0.8125rem]">
                  <a
                    className="text-foreground underline-offset-4 hover:underline"
                    href={sibling.href}
                  >
                    /{sibling.file}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {sibling.answers}
                </TableCell>
                <TableCell
                  className={cn(
                    "pr-5",
                    isFeedback
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {sibling.direction}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
