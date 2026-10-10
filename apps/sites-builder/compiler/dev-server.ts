import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createServer, request } from "node:http";
import type { IncomingMessage, Server } from "node:http";
import { connect } from "node:net";
import { join, relative } from "node:path";
import type { Duplex } from "node:stream";

import type { SiteMounts } from "@notra/sites-core/types/deployment";
import type { SiteHeadScript } from "@notra/sites-core/types/site-integrations";
import {
  joinMountPath,
  resolveAreaForPath,
} from "@notra/sites-core/utils/mounts";

import type { BuildParams } from "../src/types/build-params";
import { astroBin } from "./build";
import { ASTRO_LOG_NOISE } from "./constants/build";
import {
  DEV_READY_POLL_MS,
  DEV_READY_TIMEOUT_MS,
  DEV_STOP_TIMEOUT_MS,
} from "./constants/cli";
import type { DevAreaServer, RunningDevArea } from "./types/dev-server";

function retargetHeadScripts(
  scripts: SiteHeadScript[],
  from: string,
  to: string
): SiteHeadScript[] {
  const prefix = from === "/" ? "/" : `${from}/`;
  return scripts.map((script) =>
    script.kind === "external" && script.src.startsWith(prefix)
      ? { ...script, src: joinMountPath(to, script.src.slice(prefix.length)) }
      : script
  );
}

export function paramsForArea(
  params: BuildParams,
  area: DevAreaServer
): BuildParams {
  return {
    ...params,
    area: area.area,
    mount: area.mount,
    headScripts: retargetHeadScripts(
      params.headScripts,
      params.mount,
      area.mount
    ),
  };
}

async function waitForPort(port: number, exited: () => boolean) {
  const deadline = Date.now() + DEV_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (exited()) {
      return false;
    }
    try {
      await fetch(`http://127.0.0.1:${port}/`, { method: "HEAD" });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, DEV_READY_POLL_MS));
    }
  }
  return false;
}

function forwardOutput(chunk: Buffer) {
  const text = chunk
    .toString()
    .split("\n")
    .filter((line) => !ASTRO_LOG_NOISE.some((pattern) => pattern.test(line)))
    .join("\n");
  if (text.trim()) {
    process.stderr.write(text);
  }
}

export async function startAstroDev(
  toolchainRoot: string,
  area: DevAreaServer
): Promise<RunningDevArea | null> {
  // Each area gets its own Astro root so the two servers never share `.astro/`.
  const root = join(toolchainRoot, ".notra", "dev", area.area);
  mkdirSync(root, { recursive: true });
  const child = spawn(
    process.execPath,
    [
      astroBin(toolchainRoot),
      "dev",
      "--ignore-lock",
      "--root",
      root,
      "--config",
      relative(root, join(toolchainRoot, "astro.config.mjs")),
      "--host",
      "127.0.0.1",
      "--port",
      String(area.port),
    ],
    {
      cwd: toolchainRoot,
      env: {
        ...process.env,
        NOTRA_BUILD_PARAMS: area.paramsPath,
        ASTRO_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let exited = false;
  child.once("exit", () => {
    exited = true;
  });
  child.stdout.on("data", forwardOutput);
  child.stderr.on("data", forwardOutput);
  const ready = await waitForPort(area.port, () => exited);
  if (!ready) {
    child.kill("SIGTERM");
    return null;
  }
  return { area, child };
}

export async function stopAstroDev(running: RunningDevArea): Promise<void> {
  const { child } = running;
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, DEV_STOP_TIMEOUT_MS);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

function pathnameOf(incoming: IncomingMessage): string {
  return new URL(incoming.url ?? "/", "http://localhost").pathname;
}

function proxyUpgrade(
  incoming: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  target: DevAreaServer
) {
  const upstream = connect(target.port, "127.0.0.1", () => {
    const headers = Object.entries(incoming.headers).flatMap(([name, value]) =>
      (Array.isArray(value) ? value : [value ?? ""]).map(
        (item) => `${name}: ${item}`
      )
    );
    upstream.write(
      `${incoming.method} ${incoming.url} HTTP/${incoming.httpVersion}\r\n${headers.join("\r\n")}\r\n\r\n`
    );
    upstream.write(head);
    upstream.pipe(socket).pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}

export function startDevProxy(
  port: number,
  mounts: SiteMounts,
  areas: DevAreaServer[]
): Promise<Server> {
  const [fallback] = areas;
  const targetFor = (pathname: string) => {
    const owner = resolveAreaForPath(mounts, pathname);
    return areas.find((area) => area.area === owner?.area) ?? fallback;
  };
  const server = createServer((incoming, outgoing) => {
    const pathname = pathnameOf(incoming);
    if (fallback && pathname === "/" && !resolveAreaForPath(mounts, pathname)) {
      outgoing.writeHead(302, { location: fallback.mount });
      outgoing.end();
      return;
    }
    const target = targetFor(pathname);
    if (!target) {
      outgoing.writeHead(502);
      outgoing.end();
      return;
    }
    const upstream = request(
      {
        host: "127.0.0.1",
        port: target.port,
        method: incoming.method,
        path: incoming.url,
        headers: incoming.headers,
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      }
    );
    upstream.on("error", () => {
      if (!outgoing.headersSent) {
        outgoing.writeHead(502, { "content-type": "text/plain" });
      }
      outgoing.end(
        `The ${target.area} dev server is restarting, reload in a moment.`
      );
    });
    incoming.pipe(upstream);
  });
  server.on("upgrade", (incoming, socket, head) => {
    const target = targetFor(pathnameOf(incoming));
    if (!target) {
      socket.destroy();
      return;
    }
    proxyUpgrade(incoming, socket, head, target);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve(server));
  });
}
