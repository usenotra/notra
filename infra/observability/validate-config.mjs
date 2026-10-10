import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function upstreamImage(dockerfile, repository) {
  const stages = [
    ...dockerfile.matchAll(
      /^[\t ]*FROM[\t ]+(\S+)[\t ]+AS[\t ]+upstream[\t ]*$/gim
    ),
  ];
  const image = stages[0]?.[1];
  if (
    stages.length !== 1 ||
    !/^[a-z0-9][a-z0-9._/-]*(?::[A-Za-z0-9_][A-Za-z0-9_.-]{0,127})?@sha256:[a-f0-9]{64}$/.test(
      image ?? ""
    ) ||
    image.split("@")[0].split(":")[0] !== repository
  ) {
    throw new Error(
      `Expected exactly one digest-pinned FROM ${repository} AS upstream stage`
    );
  }
  return image;
}

export function validationCommands() {
  function command(service, repository, binary, config, args, options = []) {
    const image = upstreamImage(
      readFileSync(new URL(`${service}/Dockerfile`, import.meta.url), "utf8"),
      repository
    );
    const source = fileURLToPath(
      new URL(`${service}/${service}.yml`, import.meta.url)
    );
    return {
      service,
      args: [
        "run",
        "--rm",
        "--network",
        "none",
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--mount",
        `type=bind,source=${source},target=${config},readonly`,
        ...options,
        "--entrypoint",
        binary,
        image,
        ...args,
      ],
    };
  }

  return [
    command(
      "prometheus",
      "prom/prometheus",
      "/bin/promtool",
      "/etc/prometheus/prometheus.yml",
      ["check", "config", "/etc/prometheus/prometheus.yml"]
    ),
    command("loki", "grafana/loki", "/usr/bin/loki", "/etc/loki/notra.yml", [
      "-config.file=/etc/loki/notra.yml",
      "-verify-config=true",
    ]),
    command(
      "collector",
      "otel/opentelemetry-collector-contrib",
      "/otelcol-contrib",
      "/etc/otelcol-contrib/notra.yml",
      ["validate", "--config=/etc/otelcol-contrib/notra.yml"],
      [
        "--user",
        "10001:10001",
        "--tmpfs",
        "/var/lib/otelcol:rw,nosuid,noexec,size=16777216,uid=10001,gid=10001,mode=0700",
        "--env",
        "NOTRA_OTLP_TOKEN=notra-config-validation-fixture-only",
      ]
    ),
  ];
}

export function validateConfigs(spawn = spawnSync) {
  const commands = validationCommands();
  const docker = spawn("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  if (docker.error || docker.status !== 0) {
    throw new Error(
      "Docker is unavailable. Install/start a local Docker daemon, ensure `docker info` succeeds, then rerun `node infra/observability/validate-config.mjs`. Native validation was not skipped."
    );
  }

  for (const { service, args } of commands) {
    // These commands never start services or touch persistent storage. Collector
    // validation requires a directory, supplied only by disposable fixture tmpfs.
    // No .env file or host token is loaded/forwarded.
    const result = spawn("docker", args, { stdio: "inherit" });
    if (result.error || result.status !== 0) {
      throw Object.assign(
        new Error(
          `${service} native config validation failed${result.signal ? ` (${result.signal})` : ""}`,
          { cause: result.error }
        ),
        { exitCode: result.status || 1 }
      );
    }
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    validateConfigs();
  } catch (error) {
    console.error(error.message);
    process.exitCode = error.exitCode || 1;
  }
}
