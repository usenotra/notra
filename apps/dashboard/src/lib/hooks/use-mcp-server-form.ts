import type { AddMcpServerFormValues } from "@notra/schemas/dashboard/integrations";
import { addMcpServerFormSchema } from "@notra/schemas/dashboard/integrations";
import { useForm } from "@tanstack/react-form";

import { DEFAULT_MCP_SERVER_FORM_VALUES } from "@/constants/mcp";

export function useMcpServerForm(
  onSubmit: (value: AddMcpServerFormValues) => void,
  initialValues?: Partial<AddMcpServerFormValues>
) {
  return useForm({
    defaultValues: { ...DEFAULT_MCP_SERVER_FORM_VALUES, ...initialValues },
    validators: { onSubmit: addMcpServerFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  });
}
