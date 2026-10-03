import { Button } from "@/components/ui/button";

export default function ButtonPreview() {
  return (
    <div className="grid grid-cols-2 gap-3 self-center pb-6">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  );
}
