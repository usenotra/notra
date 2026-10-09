import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { ExcalidrawScene } from "../types/excalidraw-diagram";
import type { UploadIntegrationBrandingAssetParams } from "../types/integrations";

interface R2Env {
  accessKeyId: string;
  bucketName: string;
  endpoint: string;
  publicUrl: string;
  secretAccessKey: string;
}

let cachedClient: S3Client | undefined;
let cachedEnv: R2Env | undefined;

const TRAILING_SLASHES_RE = /\/+$/;

function normalizeEndpoint(endpoint: string, bucketName: string) {
  const trimmed = endpoint.replace(TRAILING_SLASHES_RE, "");
  const suffix = `/${bucketName}`;
  return trimmed.endsWith(suffix) ? trimmed.slice(0, -suffix.length) : trimmed;
}

function getR2Env(): R2Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;
  const endpoint = process.env.CLOUDFLARE_S3_ENDPOINT;
  const publicUrl = process.env.CLOUDFLARE_PUBLIC_URL;

  if (
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !endpoint ||
    !publicUrl
  ) {
    throw new Error("Missing R2 environment variables");
  }

  cachedEnv = {
    accessKeyId,
    bucketName,
    endpoint: normalizeEndpoint(endpoint, bucketName),
    publicUrl,
    secretAccessKey,
  };

  return cachedEnv;
}

function getR2Client() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getR2Env();
  cachedClient = new S3Client({
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
    endpoint: env.endpoint,
    forcePathStyle: true,
    region: "auto",
  });

  return cachedClient;
}

export async function uploadIntegrationBrandingAsset(
  params: UploadIntegrationBrandingAssetParams
) {
  const env = getR2Env();
  const key = `organization/${params.organizationId}/integration-branding/${params.kind}-${crypto.randomUUID()}.${params.extension}`;

  await getR2Client().send(
    new PutObjectCommand({
      Body: params.body,
      Bucket: env.bucketName,
      CacheControl: "public, max-age=31536000",
      ContentLength: params.body.byteLength,
      ContentType: params.contentType,
      ...(params.contentType === "image/svg+xml"
        ? { ContentDisposition: "attachment" }
        : {}),
      Key: key,
    })
  );

  return `${env.publicUrl.replace(TRAILING_SLASHES_RE, "")}/${key}`;
}

export async function uploadGeneratedImageAsset(params: {
  organizationId: string;
  pngBase64: string;
  postId: string;
}) {
  const env = getR2Env();
  const key = `organization/${params.organizationId}/content/${params.postId}-${Date.now()}.png`;
  const body = Buffer.from(params.pngBase64, "base64");

  await getR2Client().send(
    new PutObjectCommand({
      Body: body,
      Bucket: env.bucketName,
      CacheControl: "public, max-age=31536000",
      ContentLength: body.byteLength,
      ContentType: "image/png",
      Key: key,
    })
  );

  return `${env.publicUrl.replace(TRAILING_SLASHES_RE, "")}/${key}`;
}

export async function uploadGeneratedHtmlAsset(params: {
  organizationId: string;
  html: string;
  postId: string;
}) {
  const env = getR2Env();
  const key = `organization/${params.organizationId}/content/${params.postId}-${Date.now()}.html`;
  const body = Buffer.from(params.html, "utf-8");

  await getR2Client().send(
    new PutObjectCommand({
      Body: body,
      Bucket: env.bucketName,
      CacheControl: "public, max-age=31536000",
      ContentLength: body.byteLength,
      ContentType: "text/html; charset=utf-8",
      Key: key,
    })
  );

  return `${env.publicUrl.replace(TRAILING_SLASHES_RE, "")}/${key}`;
}

export async function uploadGeneratedExcalidrawAsset(params: {
  organizationId: string;
  scene: ExcalidrawScene;
  postId: string;
}) {
  const env = getR2Env();
  const key = `organization/${params.organizationId}/content/${params.postId}-${Date.now()}.excalidraw`;
  const body = Buffer.from(JSON.stringify(params.scene), "utf-8");

  await getR2Client().send(
    new PutObjectCommand({
      Body: body,
      Bucket: env.bucketName,
      CacheControl: "public, max-age=31536000",
      ContentLength: body.byteLength,
      ContentType: "application/json; charset=utf-8",
      Key: key,
    })
  );

  return `${env.publicUrl.replace(TRAILING_SLASHES_RE, "")}/${key}`;
}
