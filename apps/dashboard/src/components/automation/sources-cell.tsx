import { DetailCardContent } from "@notra/ui/components/ui/detail-card";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
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
  const label = tCommon("messages.countPluralOneSourceOther", { count });
  return (
    <HoverCard>
      <HoverCardTrigger className="cursor-help">{label}</HoverCardTrigger>
      <DetailCardContent title={label}>
        <ul className="flex flex-col">
          {repositoryIds.map((id) => {
            const isLinear = id.startsWith("linear:");
            const label = repositoryMap?.[id] ?? id.replace(LINEAR_PREFIX, "");
            return (
              <li
                className="flex items-center gap-2 px-3 py-1.5 text-xs"
                key={id}
              >
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
      </DetailCardContent>
    </HoverCard>
  );
}
