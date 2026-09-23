import { describe, expect, test } from "bun:test";

import {
  getMcpToolActionPhrase,
  getMcpToolLabel,
  isMcpToolName,
} from "./utils";

const sanctionsMetadata = {
  notra: {
    serverName: "Compliance",
    toolName: "check_sanctions",
    actionPhrasePresent: "Running sanctions check",
    actionPhrasePast: "Ran sanctions check",
  },
};

describe("mcp tool labels", () => {
  test("detects mcp runtime names", () => {
    expect(isMcpToolName("mcp_compliance_check_sanctions")).toBe(true);
    expect(isMcpToolName("getMarkdown")).toBe(false);
  });

  test("uses server and tool names from metadata", () => {
    expect(
      getMcpToolLabel("mcp_compliance_check_sanctions", sanctionsMetadata)
    ).toBe("Compliance - Check Sanctions");
  });

  test("uses the past action phrase after the call finishes", () => {
    expect(getMcpToolActionPhrase(sanctionsMetadata, true)).toBe(
      "Running sanctions check"
    );
    expect(getMcpToolActionPhrase(sanctionsMetadata, false)).toBe(
      "Ran sanctions check"
    );
  });
});
