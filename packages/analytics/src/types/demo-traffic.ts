import type { GeoTrafficEventRow } from "../tinybird/datasources";

export type DemoTrafficEvent = GeoTrafficEventRow;

export type DemoTrafficProvider = (scope: {
  organizationId: string;
  projectId: string;
}) => Promise<DemoTrafficEvent[]>;

/** Union of every GEO traffic pipe parameter the demo mirrors. */
export interface DemoTrafficParams {
  organization_id: string;
  project_id?: string;
  include_unassigned?: number;
  excluded_sources?: string;
  days?: number;
  date_from?: string;
  date_to?: string;
  visitor?: string;
  visitor_type?: string;
  category?: string;
  host?: string;
  journey_id?: string;
  limit?: number;
}
