import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";

function DraftCell({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex min-w-56 flex-col gap-0.5">
      <span className="text-foreground font-medium">{title}</span>
      <span className="text-muted-foreground text-sm">{description}</span>
    </div>
  );
}

export default function TableExample() {
  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Draft</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <DraftCell
                description="12 merged PRs, 3 Linear issues closed, and a new billing surface."
                title="April changelog"
              />
            </TableCell>
            <TableCell>
              <Badge>Generating</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">Blog</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              2m ago
            </TableCell>
            <TableCell className="text-right">
              <Button disabled size="sm">
                Publishing…
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <DraftCell
                description="Usage-based billing is live for every workspace."
                title="Shipped: usage-based billing"
              />
            </TableCell>
            <TableCell>
              <Badge variant="success">Published</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">Blog</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              1d ago
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline">
                View
              </Button>
            </TableCell>
          </TableRow>
          <TableRow data-state="selected">
            <TableCell>
              <DraftCell
                description="A short thread on the GEO latency drop."
                title="How we cut GEO latency"
              />
            </TableCell>
            <TableCell>
              <Badge variant="outline">Draft</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">Twitter</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              3h ago
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm">Publish</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <DraftCell
                description="Postmortem for the Redis failover window."
                title="Incident: Redis failover"
              />
            </TableCell>
            <TableCell>
              <Badge variant="warning">Scheduled</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">Slack</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              5h ago
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="outline">
                Reschedule
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <DraftCell
                description="Connect GitHub or Linear and Notra will queue the first changelog."
                title="Launch recap"
              />
            </TableCell>
            <TableCell>
              <Badge variant="destructive">Failed</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">Blog</TableCell>
            <TableCell className="text-muted-foreground text-xs">
              1d ago
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" variant="destructive">
                <HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
                Retry
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
