import { DesignSystemFrame } from "@/components/design-system/design-system-frame";

import { DesignSystemIconPreview } from "../icon-preview";

export default function DesignSystemIconsPage() {
  return (
    <DesignSystemFrame
      description="Test icon sizes, loading and disabled states, tooltips, and toast feedback without a database."
      title="Icon Preview"
    >
      <DesignSystemIconPreview />
    </DesignSystemFrame>
  );
}
