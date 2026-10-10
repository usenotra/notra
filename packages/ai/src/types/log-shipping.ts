import type { OTLPConfig } from "evlog/otlp";

export interface LogShippingPolicy {
  label: string;
  permanentErrorPattern: RegExp;
  disabledMessage: string;
}

export type OtlpBatchConfig = Pick<
  OTLPConfig,
  "endpoint" | "headers" | "serviceName"
> & { environmentName: string };
