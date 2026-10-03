import { describe, expect, test } from "bun:test";

import {
  CpuIcon,
  File01Icon,
  Github01Icon,
  GitPullRequestIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";

import { getChatToolIcon } from "./chat-tool-icon";

describe("getChatToolIcon", () => {
  test("uses a source-code icon for markdown edits", () => {
    expect(getChatToolIcon("editMarkdown")).toBe(SourceCodeIcon);
  });

  test("uses a file icon for reading markdown", () => {
    expect(getChatToolIcon("getMarkdown")).toBe(File01Icon);
  });

  test("uses GitHub icons for repository and pull request tools", () => {
    expect(getChatToolIcon("open_repository")).toBe(Github01Icon);
    expect(getChatToolIcon("get_pull_requests")).toBe(GitPullRequestIcon);
  });

  test("falls back to the cpu icon for other tools", () => {
    expect(getChatToolIcon("fetchWebpage")).toBe(CpuIcon);
    expect(getChatToolIcon("constructor")).toBe(CpuIcon);
  });
});
