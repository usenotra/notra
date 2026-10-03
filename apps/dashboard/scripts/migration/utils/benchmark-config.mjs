import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

export function localUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error("Only credential-free HTTP loopback IP URLs are permitted");
  }
  return url;
}

export function loadConfig(mode, path) {
  if (!["build", "http"].includes(mode)) {
    throw new Error("Usage: node benchmark.mjs <build|http> <config.json>");
  }
  const config = JSON.parse(readFileSync(path, "utf8"));
  if (!Number.isInteger(config.samples) || config.samples < 1) {
    throw new Error("samples must be a positive integer");
  }
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1) {
    throw new Error("timeoutMs must be a positive integer");
  }
  if (!config.label || typeof config.output !== "string") {
    throw new Error("label and output are required");
  }
  config.output = resolve(config.output);
  config.cwd = realpathSync(config.cwd ?? process.cwd());
  if (mode === "build") {
    if (
      !Array.isArray(config.command) ||
      config.command.length === 0 ||
      config.command.some((part) => typeof part !== "string") ||
      !isAbsolute(config.command[0])
    ) {
      throw new Error(
        "command must be an argv array with an absolute executable path"
      );
    }
  } else {
    const base = localUrl(config.baseUrl);
    if (!Array.isArray(config.routes) || config.routes.length === 0) {
      throw new Error("routes must contain at least one route contract");
    }
    if (!Number.isInteger(config.warmup) || config.warmup < 0) {
      throw new Error("warmup must be a nonnegative integer");
    }
    for (const route of config.routes) {
      const url = localUrl(new URL(route.path, base).href);
      if (url.origin !== base.origin || !route.path.startsWith("/")) {
        throw new Error("Routes must stay on the configured loopback origin");
      }
      if (
        !Array.isArray(route.statuses) ||
        route.statuses.length === 0 ||
        route.statuses.some(
          (status) => !Number.isInteger(status) || status < 100 || status > 599
        )
      ) {
        throw new Error("Each route requires explicit expected statuses");
      }
    }
  }
  return config;
}
