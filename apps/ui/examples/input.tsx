import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";

export default function InputExample() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input defaultValue="April changelog" id="title" />
      </div>
      <div className="flex max-w-sm flex-wrap items-center gap-2">
        <Input placeholder="Draft title" size="sm" />
        <Input placeholder="Draft title" />
        <Input placeholder="Draft title" size="lg" />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="placeholder">Placeholder</Label>
        <Input id="placeholder" placeholder="Changelog — April" />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="disabled">Disabled</Label>
        <Input disabled id="disabled" value="Cannot edit" />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="invalid">Invalid</Label>
        <Input aria-invalid="true" defaultValue="missing-title" id="invalid" />
      </div>
    </div>
  );
}
