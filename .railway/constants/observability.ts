import type { ServiceConfigInput, VolumeConfig } from "railway/iac";

export const monitoringService = {
  build: {
    buildEnvironment: "V3",
    builder: "DOCKERFILE",
    dockerfilePath: "Dockerfile",
  },
  healthcheckTimeout: 120,
  replicas: { "us-east4-eqdc4a": 1 },
  deploy: { restartPolicyMaxRetries: 5 },
  networking: { serviceDomains: {} },
  domains: [],
  tcp: [],
} satisfies ServiceConfigInput;

// Imported allocation and alert thresholds; adopting these must not resize data.
export const monitoringVolume = {
  alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  allowOnlineResize: true,
  region: "us-east4-eqdc4a",
  sizeMB: 50_000,
} satisfies VolumeConfig;
