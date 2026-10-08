import { config } from "./params";

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(
      `blog.json ${name} defaults are missing; build through notra-sites`
    );
  }
  return value;
}

export const blogOptions = required(config.blog, "blog");
export const changelogOptions = required(config.changelog, "changelog");

export function heroOptions(area: "blog" | "changelog") {
  return area === "blog" ? blogOptions.hero : changelogOptions.hero;
}
