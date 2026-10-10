import type { dashboardOrpc } from "@/lib/orpc/query";

export interface SiteVariableRow {
  id: string;
  name: string;
  value: string;
}

export type SiteVariablesDocument = Awaited<
  ReturnType<typeof dashboardOrpc.sites.editor.read.call>
>;

export interface SiteVariablesFormProps {
  document: SiteVariablesDocument;
}
