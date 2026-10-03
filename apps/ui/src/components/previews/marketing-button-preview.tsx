import { ArrowRight } from "lucide-react";

import { MarketingButton } from "../../../registry/notra/marketing-button/components/marketing-button";

export default function MarketingButtonPreview() {
  return (
    <div className="flex items-center gap-4 self-center pb-6">
      <MarketingButton>
        Start for free
        <ArrowRight />
      </MarketingButton>
      <MarketingButton variant="light">Book a call</MarketingButton>
    </div>
  );
}
