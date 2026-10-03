import { spawn } from "node:child_process";

import { previewConfig } from "./utils/preview-config.mjs";

const config = previewConfig(process.argv.slice(2));
const server = spawn(process.execPath, config.args, {
  cwd: new URL("../../", import.meta.url),
  env: config.env,
  stdio: "inherit",
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
server.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
