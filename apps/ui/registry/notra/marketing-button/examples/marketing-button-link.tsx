import { MarketingButton } from "../components/marketing-button";

export default function MarketingButtonLink() {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-center gap-6 p-8">
      <MarketingButton
        nativeButton={false}
        render={<a href="https://usenotra.com" rel="noopener" />}
      >
        Visit Notra
      </MarketingButton>
    </div>
  );
}
