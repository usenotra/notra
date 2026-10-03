import assert from "node:assert/strict";

export async function rpcRequest(base, procedure, input, status = 200) {
  const response = await fetch(`${base}/rpc/${procedure}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ json: input }),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  assert.equal(
    response.status,
    status,
    `${procedure}: ${JSON.stringify(body)}`
  );
  return body.json;
}
