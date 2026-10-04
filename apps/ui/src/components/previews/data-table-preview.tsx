import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const VISITS = [
  { bot: "GPTBot", provider: "openai", path: "/pricing" },
  { bot: "ClaudeBot", provider: "anthropic", path: "/docs" },
  { bot: "PerplexityBot", provider: "perplexity", path: "/blog" },
] as const;

export default function DataTablePreview() {
  return (
    <div className="w-80 self-center pb-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Crawler</TableHead>
            <TableHead className="text-right">Page</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {VISITS.map((visit) => (
            <TableRow key={visit.bot}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <img
                    alt=""
                    className="size-4 shrink-0 dark:invert"
                    height={16}
                    src={`https://models.dev/logos/${visit.provider}.svg`}
                    width={16}
                  />
                  {visit.bot}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-right">
                {visit.path}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
