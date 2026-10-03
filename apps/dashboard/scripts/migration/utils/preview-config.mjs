import { FIXTURE } from "../../../tests/migration/constants/parity.mjs";
import { sanitizedEnvironment } from "./sanitized-environment.mjs";

export function previewConfig(argv = [], source = process.env) {
  const mode = argv[0] ?? "production-anonymous";
  if (
    argv.length > 1 ||
    !["production-anonymous", "development-fixture"].includes(mode)
  ) {
    throw new Error(
      "Usage: node preview.mjs [production-anonymous|development-fixture]"
    );
  }
  const env = sanitizedEnvironment(source);
  if (mode === "development-fixture") {
    return {
      args: [
        "node_modules/vite/bin/vite.js",
        "--host",
        "127.0.0.1",
        "--port",
        "3000",
        "--strictPort",
      ],
      env: {
        ...env,
        NODE_ENV: "development",
        DEV_AUTH_ENABLED: "true",
        DEV_AUTH_EMAIL: FIXTURE.email,
        HOST: "127.0.0.1",
        PORT: "3000",
      },
    };
  }
  return {
    args: [".output/server/index.mjs"],
    env: { ...env, HOST: "0.0.0.0", PORT: "3000" },
  };
}
