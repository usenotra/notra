import { CODEX_COLORS, CODEX_ROW_CLASS } from "@notra/ui/constants/codex-skin";
import { cn } from "@notra/ui/lib/utils";
import type { CodexExploredProps } from "@notra/ui/types/codex-skin";

export function CodexExplored({
  items,
  active = false,
  showDetails = true,
  className,
}: CodexExploredProps) {
  return (
    <div
      className={cn(CODEX_ROW_CLASS, className)}
      style={{ color: CODEX_COLORS.foreground }}
    >
      <span
        aria-hidden="true"
        className={active ? "animate-pulse" : undefined}
        style={{ color: CODEX_COLORS.muted }}
      >
        •
      </span>
      <p className="font-bold">{active ? "Exploring" : "Explored"}</p>
      <ul className="col-start-2 grid min-w-0 grid-cols-[2ch_minmax(0,1fr)]">
        {items.map((item, index) => (
          <li className="contents" key={item.id}>
            <span aria-hidden="true" style={{ color: CODEX_COLORS.muted }}>
              {index === 0 ? "└" : ""}
            </span>
            <span className="min-w-0 truncate">
              <span style={{ color: CODEX_COLORS.blue }}>{item.verb}</span>{" "}
              {item.target}
              {item.scope ? (
                <>
                  <span style={{ color: CODEX_COLORS.muted }}> in </span>
                  {item.scope}
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {showDetails ? (
        <p className="col-start-2 pl-[2ch]" style={{ color: CODEX_COLORS.muted }}>
          + Show details
        </p>
      ) : null}
    </div>
  );
}
