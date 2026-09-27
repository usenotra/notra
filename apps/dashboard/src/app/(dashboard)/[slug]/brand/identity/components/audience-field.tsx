import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";

import type { AudienceFieldProps } from "@/types/brand-identity";

export function AudienceField({ form }: AudienceFieldProps) {
  const t = useTranslations("brand.identity.form");
  return (
    <TitleCard className="lg:col-span-2" heading={t("audienceHeading")}>
      <form.Field name="audience">
        {(field) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>{t("audienceLabel")}</Label>
            <Textarea
              className="min-h-30"
              id={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={t("audiencePlaceholder")}
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>
    </TitleCard>
  );
}
