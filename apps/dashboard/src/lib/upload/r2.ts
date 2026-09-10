import { S3Client } from "@aws-sdk/client-s3";

interface R2StorageEnv {
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
}

interface R2Env extends R2StorageEnv {
  publicUrl: string;
}

let cachedR2Client: S3Client | undefined;
let cachedR2StorageEnv: R2StorageEnv | undefined;

const TRAILING_SLASHES_RE = /\/+$/;

function normalizeEndpoint(endpoint: string, bucketName: string) {
  const trimmed = endpoint.replace(TRAILING_SLASHES_RE, "");
  const suffix = `/${bucketName}`;
  return trimmed.endsWith(suffix) ? trimmed.slice(0, -suffix.length) : trimmed;
}

function readR2StorageEnv(): R2StorageEnv | null {
  const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;
  const endpoint = process.env.CLOUDFLARE_S3_ENDPOINT;

  if (!(accessKeyId && secretAccessKey && bucketName && endpoint)) {
    return null;
  }

  return {
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint: normalizeEndpoint(endpoint, bucketName),
  };
}

function getR2StorageEnv() {
  if (cachedR2StorageEnv) {
    return cachedR2StorageEnv;
  }

  const env = readR2StorageEnv();
  if (!env) {
    throw new Error("Missing R2 environment variables");
  }

  cachedR2StorageEnv = env;
  return cachedR2StorageEnv;
}

function getR2Env() {
  const storage = getR2StorageEnv();
  const publicUrl = process.env.CLOUDFLARE_PUBLIC_URL;

  if (!publicUrl) {
    throw new Error("Missing R2 environment variables");
  }

  return {
    ...storage,
    publicUrl,
  } satisfies R2Env;
}

export function getR2Client() {
  if (cachedR2Client) {
    return cachedR2Client;
  }

  const env = getR2StorageEnv();

  cachedR2Client = new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  return cachedR2Client;
}

export function getR2Config() {
  const env = getR2Env();

  return {
    bucketName: env.bucketName,
    client: getR2Client(),
    publicUrl: env.publicUrl,
  };
}

export function getR2BucketName() {
  return getR2StorageEnv().bucketName;
}

export function isR2StorageConfigured() {
  return readR2StorageEnv() !== null;
}

export function getR2StorageConfig() {
  return {
    bucketName: getR2StorageEnv().bucketName,
    client: getR2Client(),
  };
}

export function getOptionalR2PublicUrl() {
  const publicUrl = process.env.CLOUDFLARE_PUBLIC_URL;
  return publicUrl ? publicUrl.replace(TRAILING_SLASHES_RE, "") : null;
}

export function getR2PublicUrl() {
  return getR2Env().publicUrl;
}
