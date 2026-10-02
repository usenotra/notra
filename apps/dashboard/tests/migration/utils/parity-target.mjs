export function parityTarget(value) {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Parity requires a credential-free 127.0.0.1 HTTP origin");
  }
  return url.origin;
}
