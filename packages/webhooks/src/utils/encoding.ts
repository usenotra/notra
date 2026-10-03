export function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

export function bytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
