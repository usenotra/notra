import { Badge } from "@notra/ui/components/ui/badge";

export default function BadgeExample() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <Badge variant="outline">Draft</Badge>
      <Badge variant="success">Published</Badge>
      <Badge variant="warning">Scheduled</Badge>
      <Badge>Generating</Badge>
      <Badge variant="destructive">Failed</Badge>
    </div>
  );
}
