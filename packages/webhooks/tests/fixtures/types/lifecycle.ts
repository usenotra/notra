export interface LifecycleEventRow {
  id: string;
  organization_id: string;
  source_key: string;
  event_type: string;
  payload: string;
  created_at: Date;
}

export interface LifecycleDeliveryRow {
  id: string;
  event_id: string;
  endpoint_id: string;
  organization_id: string;
  url: string;
  secret: string;
  status: string;
}
