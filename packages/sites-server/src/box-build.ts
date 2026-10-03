import { BOX_BASE_URL } from "@notra/ai/constants/repo-image";
import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import {
  type SiteBuildRequestInput,
  type SiteBuildResult,
  siteBuildRequestSchema,
  siteBuildResultSchema,
} from "@notra/sites-core/schemas/build";
import { EphemeralBox } from "@upstash/box";

import { getBoxApiKey, getSitesBuilderSnapshotId } from "./env";

const WORKDIR = "/workspace/home";
const BOX_TTL_SECONDS = SITE_BUILD_LIMITS.buildTimeoutSeconds + 5 * 60;
const ROOT_DIRECTORY = /^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]*$/;

export interface SandboxBuildResult {
  /** Validated against the shared contract; null when the sandbox produced no (valid) result. */
  result: SiteBuildResult | null;
  /** Human-readable reason when `result` is null. */
  crash: string | null;
  log: string;
  outputArchive: Uint8Array<ArrayBuffer> | null;
  toolchainVersion: string | null;
  durationMs: number;
}

export function isSafeRootDirectory(rootDirectory: string): boolean {
  return (
    ROOT_DIRECTORY.test(rootDirectory) &&
    !rootDirectory
      .split("/")
      .some((segment) => segment === ".." || segment.startsWith("."))
  );
}

function boxHeaders(): Record<string, string> {
  return { "X-Box-Api-Key": getBoxApiKey() };
}

async function uploadBytes(
  boxId: string,
  files: Array<{ path: string; data: Uint8Array<ArrayBuffer> }>
) {
  const form = new FormData();
  for (const file of files) {
    form.append("paths", file.path);
    form.append(
      "files",
      new Blob([file.data]),
      file.path.split("/").pop() ?? "file"
    );
  }
  const response = await fetch(`${BOX_BASE_URL}/v2/box/${boxId}/files/upload`, {
    method: "POST",
    headers: boxHeaders(),
    body: form,
  });
  if (!response.ok) {
    throw new Error(
      `Uploading to the build sandbox failed (${response.status}): ${await response.text()}`
    );
  }
}

async function downloadBytes(
  boxId: string,
  path: string,
  maxBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(
    `${BOX_BASE_URL}/v2/box/${boxId}/files/download?folder=${encodeURIComponent(path)}`,
    { headers: boxHeaders() }
  );
  if (!response.ok) {
    throw new Error(
      `Downloading ${path} from the build sandbox failed (${response.status})`
    );
  }
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > maxBytes) {
    throw new Error(`${path} is larger than allowed (${length} bytes)`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new Error(
      `${path} is larger than allowed (${bytes.byteLength} bytes)`
    );
  }
  return bytes;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const LOG_POLL_MS = 2000;

/** Reads the growing build log out of the box until stopped; each new version goes to `onLog`. */
function followBuildLog(
  box: EphemeralBox,
  onLog: (log: string) => Promise<void>
): { stop: () => Promise<void> } {
  const stopped = new AbortController();
  let last = "";
  const loop = (async () => {
    while (!stopped.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, LOG_POLL_MS));
      if (stopped.signal.aborted) {
        break;
      }
      const log = await box.files
        .read(`${WORKDIR}/build.log`)
        .catch(() => null);
      if (log && log !== last) {
        last = log;
        await onLog(log.slice(-SITE_BUILD_LIMITS.maxBuildLogBytes)).catch(
          () => undefined
        );
      }
    }
  })();
  return {
    stop: async () => {
      stopped.abort();
      await loop;
    },
  };
}

/**
 * Builds a customer site inside a fresh Upstash Box restored from the toolchain
 * snapshot. The box has no network access and no credentials: the repository
 * archive goes in, a tarball of static files comes out. Customer components
 * may run arbitrary JavaScript during the build, but only in here.
 */
export async function runSandboxBuild(params: {
  sourceArchive: Uint8Array<ArrayBuffer>;
  rootDirectory: string;
  target: SiteBuildRequestInput;
  /** Receives the build log while the build runs, so the dashboard can follow it live. */
  onLog?: (log: string) => Promise<void>;
}): Promise<SandboxBuildResult> {
  if (!isSafeRootDirectory(params.rootDirectory)) {
    throw new Error(`Invalid root directory "${params.rootDirectory}"`);
  }
  const startedAt = Date.now();
  const box = await EphemeralBox.fromSnapshot(getSitesBuilderSnapshotId(), {
    apiKey: getBoxApiKey(),
    baseUrl: BOX_BASE_URL,
    name: `notra-site-${params.target.deploymentId.slice(0, 16)}`,
    size: "medium",
    ttl: BOX_TTL_SECONDS,
    networkPolicy: { mode: "deny-all" },
    timeout: (SITE_BUILD_LIMITS.buildTimeoutSeconds + 60) * 1000,
  });
  try {
    await uploadBytes(box.id, [
      { path: `${WORKDIR}/source.tgz`, data: params.sourceArchive },
      {
        path: `${WORKDIR}/target.json`,
        data: new TextEncoder().encode(
          JSON.stringify(siteBuildRequestSchema.parse(params.target))
        ),
      },
    ]);

    const sourceDir = params.rootDirectory
      ? `../src/${params.rootDirectory}`
      : "../src";
    const script = [
      `cd ${WORKDIR} || exit 3`,
      "rm -rf src out out.tgz result.json build.log exit-code",
      "mkdir -p src",
      // GitHub tarballs wrap everything in one owner-repo-sha/ directory.
      "tar xzf source.tgz -C src --strip-components=1 --no-same-owner --no-same-permissions || exit 3",
      "rm -f source.tgz",
      "cd toolchain || exit 3",
      `timeout ${SITE_BUILD_LIMITS.buildTimeoutSeconds} node dist/cli.mjs build --source ${shellQuote(sourceDir)} --target ../target.json --out ../out --result-file ../result.json > ../build.log 2>&1`,
      "echo $? > ../exit-code",
      "cd ..",
      "if [ -d out ]; then tar czf out.tgz -C out .; fi",
      'echo "exit=$(cat exit-code)"',
    ].join("\n");
    const follower = params.onLog ? followBuildLog(box, params.onLog) : null;
    let run: Awaited<ReturnType<typeof box.exec.command>>;
    try {
      run = await box.exec.command(`sh -c ${shellQuote(script)}`);
    } finally {
      await follower?.stop();
    }
    const runOutput = String(run.result ?? "");

    const [resultText, logText, versionText, exitText] = await Promise.all([
      box.files.read(`${WORKDIR}/result.json`).catch(() => null),
      box.files.read(`${WORKDIR}/build.log`).catch(() => ""),
      box.files.read(`${WORKDIR}/toolchain/VERSION`).catch(() => null),
      box.files.read(`${WORKDIR}/exit-code`).catch(() => null),
    ]);
    const log = (logText || runOutput).slice(
      -SITE_BUILD_LIMITS.maxBuildLogBytes
    );
    const toolchainVersion = versionText?.trim() ?? null;
    const durationMs = Date.now() - startedAt;
    const parsed = resultText
      ? siteBuildResultSchema.safeParse(safeJson(resultText))
      : null;
    if (!parsed?.success) {
      let crash =
        "The build stopped before it produced a result. See the build log.";
      if (exitText?.trim() === "124") {
        crash = `The build took longer than ${SITE_BUILD_LIMITS.buildTimeoutSeconds / 60} minutes`;
      } else if (parsed) {
        crash = "The build produced an invalid result.";
      }
      return {
        result: null,
        crash,
        log,
        outputArchive: null,
        toolchainVersion,
        durationMs,
      };
    }
    const outputArchive = parsed.data.ok
      ? await downloadBytes(
          box.id,
          `${WORKDIR}/out.tgz`,
          SITE_BUILD_LIMITS.maxOutputBytes
        )
      : null;
    return {
      result: parsed.data,
      crash: null,
      log,
      outputArchive,
      toolchainVersion,
      durationMs,
    };
  } finally {
    await box.delete().catch(() => undefined);
  }
}
