import type { KeyObject } from "node:crypto";

import { PUBLIC_KEY_CHUNK_LENGTH } from "../constants/domain-connect";

export function publicKeyTxtRecords(publicKey: KeyObject): string[] {
  const der = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  const records: string[] = [];
  for (let offset = 0; offset < der.length; offset += PUBLIC_KEY_CHUNK_LENGTH) {
    records.push(
      `p=${records.length + 1},a=RS256,d=${der.slice(offset, offset + PUBLIC_KEY_CHUNK_LENGTH)}`
    );
  }
  return records;
}
