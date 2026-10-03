import { PerplexityMessage } from "../../../registry/notra/perplexity/components/perplexity-message";

export default function PerplexityPreview() {
  return (
    <div className="border-pplx-border bg-pplx-bg flex w-[26rem] origin-top scale-[0.8] flex-col gap-6 overflow-hidden rounded-2xl border p-6 shadow-sm">
      <PerplexityMessage from="user">
        who did notion buy to build notion mail?
      </PerplexityMessage>
      <PerplexityMessage from="assistant">
        Notion bought Skiff, the team and technology behind what later became
        Notion Mail.
      </PerplexityMessage>
    </div>
  );
}
