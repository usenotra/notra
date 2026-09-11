import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";

export default function CardExample() {
  return (
    <div className="flex flex-wrap items-start gap-4 p-4">
      <Card className="w-80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge>Generating</Badge>
            <span className="text-muted-foreground text-xs">2m ago</span>
          </div>
          <CardTitle>April changelog</CardTitle>
          <CardDescription>
            12 merged PRs, 3 Linear issues closed, and a new billing surface.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className="w-52">
        <CardHeader>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Published this week
          </p>
          <p className="text-3xl font-semibold tracking-tight">18</p>
          <p className="text-success text-sm">+4 vs last week</p>
        </CardHeader>
      </Card>
      <Card className="w-80">
        <CardHeader>
          <CardTitle>No drafts yet</CardTitle>
          <CardDescription>
            Connect GitHub or Linear and Notra will queue the first changelog
            from this week&apos;s activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button>Connect a source</Button>
        </CardContent>
      </Card>
    </div>
  );
}
