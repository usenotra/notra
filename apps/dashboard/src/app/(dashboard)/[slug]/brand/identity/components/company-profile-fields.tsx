import { Input } from "@notra/ui/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "use-intl";

import type { CompanyProfileFieldsProps } from "@/types/brand-identity";

export function CompanyProfileFields({ form }: CompanyProfileFieldsProps) {
  const t = useTranslations("brand.identity.form");
  const tCommon = useTranslations("common");
  return (
    <TitleCard heading={t("companyProfileHeading")}>
      <div className="space-y-6">
        <form.Field name="companyName">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                {tCommon("labels.companyName")}
              </Label>
              <Input
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={t("companyNamePlaceholder")}
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="websiteUrl">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>{tCommon("labels.website")}</Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>https://</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="example.com"
                  type="text"
                  value={field.state.value}
                />
              </InputGroup>
            </div>
          )}
        </form.Field>

        <form.Field name="companyDescription">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>
                {tCommon("labels.description")}
              </Label>
              <Textarea
                className="min-h-30"
                id={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>
    </TitleCard>
  );
}
