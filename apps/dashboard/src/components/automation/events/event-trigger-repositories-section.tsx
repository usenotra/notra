import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@notra/ui/components/ui/combobox";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { useTranslations } from "next-intl";

import { AddRepositoryButton } from "@/components/integrations/add-repository-button";
import type { EventTriggerRepositoriesSectionProps } from "@/types/automation/event-trigger";

export function EventTriggerRepositoriesSection({
  form,
  isLoading,
  options,
  onAddRepository,
}: EventTriggerRepositoriesSectionProps) {
  const t = useTranslations("automation.events.dialog");
  const tCommon = useTranslations("common");
  const comboboxAnchor = useComboboxAnchor();

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="flex items-center gap-1 text-base font-semibold">
          {tCommon("labels.repositories")}
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </h3>
        <p className="text-muted-foreground text-sm">{t("repositoriesHint")}</p>
      </div>
      {isLoading && <Skeleton className="h-10 w-full" />}
      {!isLoading && options.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
          <span className="text-muted-foreground flex-1 text-xs">
            {t("noRepositories")}
          </span>
          <AddRepositoryButton onAdd={onAddRepository} />
        </div>
      )}
      {!isLoading && options.length > 0 && (
        <form.Field name="repositoryIds">
          {(field) => (
            <div ref={comboboxAnchor}>
              <Combobox
                items={options.map((o) => o.value)}
                multiple
                onValueChange={(value) =>
                  field.handleChange(Array.isArray(value) ? value : [])
                }
                value={field.state.value}
              >
                <ComboboxChips>
                  {field.state.value.map((id) => {
                    const opt = options.find((o) => o.value === id);
                    if (!opt) {
                      return null;
                    }
                    return (
                      <ComboboxChip className="max-w-full" key={opt.value}>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Github className="size-3 shrink-0" />
                          <span className="truncate" title={opt.label}>
                            {opt.label}
                          </span>
                        </span>
                      </ComboboxChip>
                    );
                  })}
                  <ComboboxChipsInput
                    placeholder={tCommon("labels.searchRepositories")}
                  />
                </ComboboxChips>
                <ComboboxContent anchor={comboboxAnchor.current}>
                  <ComboboxEmpty>
                    {tCommon("labels.noRepositoriesFound")}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {options.map((opt) => (
                      <ComboboxItem key={opt.value} value={opt.value}>
                        <span className="flex min-w-0 items-center gap-2">
                          <Github className="size-3.5 shrink-0" />
                          <span className="truncate" title={opt.label}>
                            {opt.label}
                          </span>
                        </span>
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          )}
        </form.Field>
      )}
    </section>
  );
}
