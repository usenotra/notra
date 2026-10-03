import { Button } from "@/components/ui/button";

export default function ButtonSizesExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-6">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <Button disabled>Disabled</Button>
      <Button disabled variant="secondary">
        Disabled
      </Button>
    </div>
  );
}
