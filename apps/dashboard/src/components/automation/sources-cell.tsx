import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";

const LINEAR_PREFIX = /^linear:/;

interface SourcesCellProps {
  repositoryIds: string[];
  repositoryMap?: Record<string, string>;
}

export function SourcesCell({
  repositoryIds,
  repositoryMap,
}: SourcesCellProps) {
  const tCommon = useTranslations("common");
  const count = repositoryIds.length;
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help">
        {tCommon("messages.countPluralOneSourceOther", { count })}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" side="top">
        <ul className="space-y-1">
          {repositoryIds.map((id) => {
            const isLinear = id.startsWith("linear:");
            const label = repositoryMap?.[id] ?? id.replace(LINEAR_PREFIX, "");
            return (
              <li className="flex items-center gap-1.5" key={id}>
                {isLinear ? (
                  <Linear className="size-3 shrink-0" />
                ) : (
                  <Github className="size-3 shrink-0" />
                )}
                <span className="min-w-0 wrap-anywhere">{label}</span>
              </li>
            );
          })}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
