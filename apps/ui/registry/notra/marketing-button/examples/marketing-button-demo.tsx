import { ArrowRight } from "lucide-react";

import { MarketingButton } from "../components/marketing-button";

export default function MarketingButtonDemo() {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-6 p-8">
      <MarketingButton>
        Start for free
        <ArrowRight />
      </MarketingButton>
      <MarketingButton variant="light">Book a call</MarketingButton>
    </div>
  );
}
