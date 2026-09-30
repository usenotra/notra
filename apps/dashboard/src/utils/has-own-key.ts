export function hasOwnKey<T extends object>(
  record: T,
  key: PropertyKey
): key is keyof T {
  return Object.hasOwn(record, key);
}
