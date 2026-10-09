import { isCustomScriptPath } from "@notra/sites-core/utils/custom-scripts";

export function hasReactComponents(
  outputs: ReadonlyMap<string, string>
): boolean {
  return [...outputs.keys()].some(
    (path) =>
      /\.jsx?$/i.test(path) &&
      !path.startsWith("public/") &&
      !isCustomScriptPath(path)
  );
}
