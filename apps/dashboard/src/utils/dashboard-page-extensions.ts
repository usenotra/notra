export function dashboardPageExtensions(env: string | undefined) {
  return [
    ...(env === "development" ? ["dev.tsx"] : []),
    "tsx",
    "ts",
    "jsx",
    "js",
  ];
}
