import { SiteInputError } from "../errors";

const ROOT_DIRECTORY = /^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]*$/;
const EDGE_SLASHES = /^\/+|\/+$/g;

export function isSafeRootDirectory(rootDirectory: string): boolean {
  return (
    ROOT_DIRECTORY.test(rootDirectory) &&
    !rootDirectory
      .split("/")
      .some((segment) => segment === ".." || segment.startsWith("."))
  );
}

export function parseRootDirectory(input: string): string {
  const rootDirectory = input.trim().replace(EDGE_SLASHES, "");
  if (!isSafeRootDirectory(rootDirectory)) {
    throw new SiteInputError(
      "The root directory may only contain letters, digits, dots, dashes and slashes",
      { field: "rootDirectory" }
    );
  }
  return rootDirectory;
}

export function repositoryPath(rootDirectory: string, path: string): string {
  return rootDirectory ? `${rootDirectory}/${path}` : path;
}
