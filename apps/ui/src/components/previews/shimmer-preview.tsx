import { Shimmer } from "../../../registry/notra/shimmer/components/shimmer";

export default function ShimmerPreview() {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-3 self-center pb-6 text-base">
      <Shimmer>Thinking...</Shimmer>
      <Shimmer duration={2.4}>Searching the web</Shimmer>
    </div>
  );
}
