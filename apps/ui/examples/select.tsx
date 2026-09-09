import { Button } from "@notra/ui/components/ui/button";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";

type FieldSize = "sm" | "default" | "lg";

const channels = {
  blog: "Blog",
  twitter: "Twitter",
  slack: "Slack",
} as const;

const sorts = {
  newest: "Newest first",
  oldest: "Oldest first",
} as const;

function ChannelSelect({
  className,
  id,
  size = "default",
}: {
  className?: string;
  id?: string;
  size?: FieldSize;
}) {
  return (
    <Select defaultValue="blog" items={channels} size={size}>
      <SelectTrigger className={className} id={id}>
        <SelectValue placeholder="Channel" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="blog">Blog</SelectItem>
        <SelectItem value="twitter">Twitter</SelectItem>
        <SelectItem value="slack">Slack</SelectItem>
      </SelectContent>
    </Select>
  );
}

function SortSelect({ size = "default" }: { size?: FieldSize }) {
  return (
    <Select defaultValue="newest" items={sorts} size={size}>
      <SelectTrigger className="w-40 shrink-0">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Newest first</SelectItem>
        <SelectItem value="oldest">Oldest first</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function SelectExample() {
  return (
    <div className="flex w-[42rem] max-w-full flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="channel">Channel</Label>
        <ChannelSelect className="w-full" id="channel" />
      </div>
      {(["sm", "default", "lg"] as const).map((size) => (
        <div className="flex items-center gap-2" key={size}>
          <span className="text-muted-foreground w-14 shrink-0 text-xs">
            {size}
          </span>
          <Input
            className="min-w-0 flex-1"
            placeholder="Draft title"
            size={size}
          />
          <ChannelSelect className="w-36 shrink-0" size={size} />
          <SortSelect size={size} />
          <Button className="shrink-0" size={size}>
            Save
          </Button>
        </div>
      ))}
    </div>
  );
}
