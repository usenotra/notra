import { Shimmer } from "../components/shimmer";

export default function ShimmerExample() {
  return (
    <div className="text-muted-foreground flex flex-col gap-3 p-6 text-sm">
      <Shimmer>Thinking...</Shimmer>
      <Shimmer duration={2.4}>Searching the web</Shimmer>
    </div>
  );
}
