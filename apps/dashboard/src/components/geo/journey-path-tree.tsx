import { JourneyPathPill } from "@/components/geo/journey-path-pill";
import { cn } from "@/lib/utils";
import type { GeoJourneyTreeNode, JourneyPathTreeProps } from "@/types/geo";
import { formatGeoJourneyClock } from "@/utils/geo-journey";

function JourneyTreeRow({ node }: { node: GeoJourneyTreeNode }) {
  return (
    <div className="flex h-6 items-center gap-2 whitespace-nowrap">
      <JourneyPathPill className="h-6 px-2" node={node} />
      {node.hits > 1 ? (
        <span
          className="text-muted-foreground text-[0.6875rem] tabular-nums"
          title={`Fetched ${node.hits} times`}
        >
          ×{node.hits}
        </span>
      ) : null}
      <span className="text-muted-foreground/70 text-[0.6875rem] tabular-nums">
        {formatGeoJourneyClock(node.firstSeenAt)}
      </span>
    </div>
  );
}

/**
 * A single next page continues straight down; only a real branch (the agent
 * went back and took another route) indents, so long crawls stay readable.
 */
function JourneyTreeBranch({ node }: { node: GeoJourneyTreeNode }) {
  const [onlyChild] = node.children;

  return (
    <div>
      <JourneyTreeRow node={node} />
      {node.children.length === 1 && onlyChild ? (
        <>
          <span aria-hidden className="bg-border ml-3 block h-3 w-px" />
          <JourneyTreeBranch node={onlyChild} />
        </>
      ) : null}
      {node.children.length > 1 ? (
        <ul className="ml-3">
          {node.children.map((child, index) => {
            const last = index === node.children.length - 1;
            return (
              <li className="relative pt-3 pl-5" key={child.id}>
                <span
                  aria-hidden
                  className={cn(
                    "bg-border absolute top-0 left-0 w-px",
                    last ? "h-6" : "bottom-0"
                  )}
                />
                <span
                  aria-hidden
                  className="bg-border absolute top-6 left-0 h-px w-5"
                />
                <JourneyTreeBranch node={child} />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function JourneyPathTree({ roots }: JourneyPathTreeProps) {
  if (roots.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No pages captured for this journey.
      </p>
    );
  }

  return (
    <ul className="flex w-max min-w-full flex-col gap-4">
      {roots.map((root) => (
        <li key={root.id}>
          <JourneyTreeBranch node={root} />
        </li>
      ))}
    </ul>
  );
}
