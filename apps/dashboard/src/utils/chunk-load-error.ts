export function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "ChunkLoadError" ||
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS for/.test(
        error.message
      ))
  );
}

export function reloadForClientUpdate(): void {
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(
    `/api/client-update?${new URLSearchParams({ returnTo })}`
  );
}
