import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";

function AddIcon() {
  return <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />;
}

export default function ButtonExample() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs">
          <AddIcon />
          New draft
        </Button>
        <Button size="sm">
          <AddIcon />
          New draft
        </Button>
        <Button>
          <AddIcon />
          New draft
        </Button>
        <Button size="lg">
          <AddIcon />
          New draft
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline">
          <AddIcon />
          New draft
        </Button>
        <Button variant="secondary">
          <AddIcon />
          New draft
        </Button>
        <Button disabled>
          <AddIcon />
          New draft
        </Button>
        <Button size="icon">
          <AddIcon />
          <span className="sr-only">Add</span>
        </Button>
        <Button size="icon" variant="outline">
          <AddIcon />
          <span className="sr-only">Add</span>
        </Button>
        <Button size="icon-xs" variant="outline">
          <AddIcon />
          <span className="sr-only">Add extra small</span>
        </Button>
      </div>
    </div>
  );
}
