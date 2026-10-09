import { gzipSync } from "node:zlib";

export function createSiteArchive(paths: string[]): Uint8Array<ArrayBuffer> {
  const blocks = paths.flatMap((path) => {
    const header = Buffer.alloc(512);
    header.write(path);
    header.write("00000000001\0", 124);
    header[156] = "0".charCodeAt(0);
    return [header, Buffer.from("x"), Buffer.alloc(511)];
  });
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}
