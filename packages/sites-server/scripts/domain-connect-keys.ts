import { createPublicKey, generateKeyPairSync } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { parseArgs } from "node:util";

import { getDomainConnectConfig } from "../src/domain-connect";
import { publicKeyTxtRecords } from "../src/utils/domain-connect-keys";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", default: false },
    "key-host": { type: "string" },
    domain: { type: "string", default: "domainconnect.usenotra.com" },
  },
});
const keyHost =
  values["key-host"] ??
  (process.env.SITES_DOMAIN_CONNECT_KEY_HOST?.trim() || "_dck1");
const recordName = `${keyHost}.${values.domain}`;

function partNumber(record: string): number {
  return Number(/(?:^|,)p=(\d+)/.exec(record)?.[1] ?? 0);
}

if (values.check) {
  const config = getDomainConnectConfig();
  if (!config) {
    console.error("SITES_DOMAIN_CONNECT_PRIVATE_KEY is missing or invalid");
    process.exit(1);
  }
  const expected = publicKeyTxtRecords(createPublicKey(config.privateKey));
  const published = (await resolveTxt(recordName))
    .map((chunks) => chunks.join(""))
    .sort((a, b) => partNumber(a) - partNumber(b));
  const matches =
    published.length === expected.length &&
    published.every((record, index) => record === expected[index]);
  console.log(
    matches
      ? `OK: ${recordName} publishes the public key of SITES_DOMAIN_CONNECT_PRIVATE_KEY`
      : `MISMATCH at ${recordName}\npublished:\n${published.join("\n")}\nexpected:\n${expected.join("\n")}`
  );
  process.exit(matches ? 0 : 1);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

console.log("SITES_DOMAIN_CONNECT_PRIVATE_KEY (PKCS#8, keep secret):\n");
console.log(pem);
console.log("Single-line form for env editors:\n");
console.log(
  `SITES_DOMAIN_CONNECT_PRIVATE_KEY="${pem.trim().replaceAll("\n", "\\n")}"`
);
console.log(`SITES_DOMAIN_CONNECT_KEY_HOST=${keyHost}\n`);
console.log(
  `Publish these as separate TXT records, all named ${recordName}:\n`
);
for (const record of publicKeyTxtRecords(publicKey)) {
  console.log(record);
}
