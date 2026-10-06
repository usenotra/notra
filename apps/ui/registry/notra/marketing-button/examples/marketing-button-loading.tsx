"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

import {
  MarketingButton,
  type MarketingButtonProps,
} from "../components/marketing-button";

const LOADING_DURATION_MS = 2400;

function LoadingMarketingButton(
  props: Omit<MarketingButtonProps, "loading" | "onClick">
) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), LOADING_DURATION_MS);
  };

  return <MarketingButton {...props} loading={loading} onClick={handleClick} />;
}

export default function MarketingButtonLoading() {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-6 p-8">
      <LoadingMarketingButton>
        Start for free
        <ArrowRight />
      </LoadingMarketingButton>
      <LoadingMarketingButton variant="light">
        Book a call
      </LoadingMarketingButton>
    </div>
  );
}
