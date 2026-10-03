import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { ANONYMOUS_CONTRACTS } from "./constants/parity.mjs";
import { parityTarget } from "./utils/parity-target.mjs";

const base = parityTarget(process.argv[2]);
const output = resolve(process.argv[3]);
const results = [];
for (const contract of ANONYMOUS_CONTRACTS) {
  try {
    const response = await fetch(`${base}${contract.path}`, {
      method: contract.method ?? "GET",
      body: contract.body,
      headers: contract.body ? { "content-type": "application/json" } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    await response.arrayBuffer();
    assert.equal(response.status, contract.status);
    results.push({
      path: contract.path,
      passed: true,
      status: response.status,
    });
  } catch (error) {
    results.push({ path: contract.path, passed: false, error: String(error) });
  }
}
for (const origin of ["https://attacker.invalid", "http://localhost:3000"]) {
  try {
    const response = await fetch(`${base}/api/session`, {
      method: "OPTIONS",
      headers: { origin },
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      origin.includes("attacker") ? null : origin
    );
    results.push({ path: `/api/session OPTIONS ${origin}`, passed: true });
  } catch (error) {
    results.push({
      path: `/api/session OPTIONS ${origin}`,
      passed: false,
      error: String(error),
    });
  }
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(
  output,
  JSON.stringify({ base, profile: "production-anonymous", results }, null, 2),
  { flag: "wx" }
);
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.every((result) => result.passed) ? 0 : 1;
