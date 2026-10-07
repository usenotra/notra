import { BOX_BASE_URL } from "@notra/ai/constants/repo-image";
import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import {
  siteBuildRequestSchema,
  siteBuildResultSchema,
} from "@notra/sites-core/schemas/build";
import { EphemeralBox } from "@upstash/box";

import {
  BOX_TTL_SECONDS,
  BOX_WORKDIR,
  BUILD_LOG_POLL_MS,
} from "./constants/build";
import { getBoxApiKey, getSitesBuilderSnapshotId } from "./env";
import type {
  BuildLogFollower,
  SandboxBuildParams,
  SandboxBuildResult,
  SandboxUploadFile,
} from "./types/build";
import { safeJson } from "./utils/json";
import { readBodyUpTo } from "./utils/read-body";
import { isSafeRootDirectory } from "./utils/root-directory";
import { shellQuote } from "./utils/shell";

function boxHeaders(): Record<string, string> {
  return { "X-Box-Api-Key": getBoxApiKey() };
}

async function uploadBytes(boxId: string, files: SandboxUploadFile[]) {
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

export async function downloadBytes(
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
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`${path} is larger than allowed (${length} bytes)`);
  }
  const { bytes, exceeded } = await readBodyUpTo(response, maxBytes);
  if (exceeded) {
    throw new Error(
      `${path} is larger than allowed (${bytes.byteLength} bytes)`
    );
  }
  return bytes;
}

function followBuildLog(
  box: EphemeralBox,
  onLog: (log: string) => Promise<void>
): BuildLogFollower {
  const stopped = new AbortController();
  let last = "";
  const loop = (async () => {
    while (!stopped.signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, BUILD_LOG_POLL_MS));
      if (stopped.signal.aborted) {
        break;
      }
      const log = await box.files
        .read(`${BOX_WORKDIR}/build.log`)
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

function crashReason(exitText: string | null, wroteResult: boolean): string {
  if (exitText?.trim() === "124") {
    return `The build took longer than ${SITE_BUILD_LIMITS.buildTimeoutSeconds / 60} minutes`;
  }
  return wroteResult
    ? "The build produced an invalid result."
    : "The build stopped before it produced a result. See the build log.";
}

export async function runSandboxBuild(
  params: SandboxBuildParams
): Promise<SandboxBuildResult> {
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
      { path: `${BOX_WORKDIR}/source.tgz`, data: params.sourceArchive },
      {
        path: `${BOX_WORKDIR}/target.json`,
        data: new TextEncoder().encode(
          JSON.stringify(siteBuildRequestSchema.parse(params.target))
        ),
      },
    ]);

    const sourceDir = params.rootDirectory
      ? `../src/${params.rootDirectory}`
      : "../src";
    const script = [
      `cd ${BOX_WORKDIR} || exit 3`,
      "rm -rf src out out.tgz result.json build.log exit-code",
      "mkdir -p src",
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
      box.files.read(`${BOX_WORKDIR}/result.json`).catch(() => null),
      box.files.read(`${BOX_WORKDIR}/build.log`).catch(() => ""),
      box.files.read(`${BOX_WORKDIR}/toolchain/VERSION`).catch(() => null),
      box.files.read(`${BOX_WORKDIR}/exit-code`).catch(() => null),
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
      return {
        result: null,
        crash: crashReason(exitText, parsed !== null),
        log,
        outputArchive: null,
        toolchainVersion,
        durationMs,
      };
    }
    const outputArchive = parsed.data.ok
      ? await downloadBytes(
          box.id,
          `${BOX_WORKDIR}/out.tgz`,
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
