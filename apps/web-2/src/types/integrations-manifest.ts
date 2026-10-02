export type IntegrationsManifestBasis = {
  via: "declared";
  source: string;
};

type IntegrationsManifestCredential = {
  type: "api_key" | "oauth2";
  label: string;
  generateUrl?: string;
  setup: string;
};

export type IntegrationsManifestMechanics =
  | {
      source: "http";
      in: "header";
      headerName: string;
      scheme: string;
    }
  | {
      source: "cli";
      command?: string;
      env?: string[];
    }
  | {
      source: "well-known";
    };

export type IntegrationsManifestAuthEntry = {
  use: {
    id: string;
    mechanics: IntegrationsManifestMechanics;
  }[];
  basis: IntegrationsManifestBasis;
};

type IntegrationsManifestAuth = {
  status: "required";
  entries: IntegrationsManifestAuthEntry[];
};

type IntegrationsManifestSurfaceBase = {
  slug: string;
  name: string;
  docs: string;
  basis: IntegrationsManifestBasis;
  auth: IntegrationsManifestAuth;
};

type IntegrationsManifestSurface =
  | (IntegrationsManifestSurfaceBase & {
      type: "http";
      spec: string;
      url: string;
    })
  | (IntegrationsManifestSurfaceBase & {
      type: "mcp";
      url: string;
      transports: ["streamable-http"];
    })
  | (IntegrationsManifestSurfaceBase & {
      type: "cli";
      command: string;
      packages: {
        registryType: "npm";
        identifier: string;
        runtimeHint: string;
      }[];
    });

export type IntegrationsManifest = {
  version: 3;
  summary: string;
  credentials: Record<string, IntegrationsManifestCredential>;
  surfaces: IntegrationsManifestSurface[];
};
