import { Button } from "@/components/ui/button";

export default function ButtonVariantsExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  );
}
