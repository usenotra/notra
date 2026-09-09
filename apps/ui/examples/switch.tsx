import { Label } from "@notra/ui/components/ui/label";
import { Switch } from "@notra/ui/components/ui/switch";

export default function SwitchExample() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Switch defaultChecked id="auto-publish" />
        <Label htmlFor="auto-publish">Queue drafts automatically</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="auto-publish-sm" size="sm" />
        <Label htmlFor="auto-publish-sm">Dense row</Label>
      </div>
    </div>
  );
}
