import type { AddMcpServerFormValues } from "@notra/schemas/dashboard/integrations";
import { useForm } from "@tanstack/react-form";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { DEFAULT_MCP_SERVER_FORM_VALUES } from "@/constants/mcp";
import { createMcpServerFormSchema } from "@/schemas/mcp-server-form";

export function useMcpServerForm(
  onSubmit: (value: AddMcpServerFormValues) => void,
  initialValues?: Partial<AddMcpServerFormValues>
) {
  const t = useTranslations("integrations.mcp.form");
  const tCommon = useTranslations("common");
  const tShared = useTranslations("integrations.shared");
  const formSchema = useMemo(
    () => createMcpServerFormSchema(t, tCommon, tShared),
    [t, tCommon, tShared]
  );

  return useForm({
    defaultValues: { ...DEFAULT_MCP_SERVER_FORM_VALUES, ...initialValues },
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });
}
