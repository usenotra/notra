import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";

export default function TextareaExample() {
  return (
    <div className="flex max-w-md flex-col gap-2 p-4">
      <Label htmlFor="notes">Notes</Label>
      <Textarea
        defaultValue="12 merged PRs, 3 Linear issues closed, and a new billing surface."
        id="notes"
      />
    </div>
  );
}
