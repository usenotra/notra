import type { EventRecord } from "../types/webhooks";

export const eventInsertParameters = (record: EventRecord) =>
  [
    record.id,
    record.body.organizationId,
    record.body.sourceKey,
    record.body.event.type,
    record.payload,
  ] as const;

export const eventSelectBySourceParameters = (record: EventRecord) =>
  [record.body.organizationId, record.body.sourceKey] as const;
