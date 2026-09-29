import { MarketingButton } from "../components/marketing-button";

export default function MarketingButtonSizes() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 p-8">
      <MarketingButton size="default">Default</MarketingButton>
      <MarketingButton size="lg">Large</MarketingButton>
    </div>
  );
}
