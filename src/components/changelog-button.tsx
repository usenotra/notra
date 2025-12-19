"use client";

import { useCompletion } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import { Card, CardContent } from "./ui/card";

export function ChangelogButton() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/workflows/ai/changelog",
  });

  const handleClick = async () => {
    await complete(
      "Generate a changelog for this repository: https://github.com/shadcn-ui/ui and this release tag: shadcn@3.6.2"
    );
  };

  return (
    <div>
      <button disabled={isLoading} onClick={handleClick} type="button">
        {isLoading ? "Generating..." : "Generate Changelog"}
      </button>
      {error !== null && error !== undefined ? (
        <div style={{ color: "red", marginTop: "1rem" }}>
          Error: {error.message}
        </div>
      ) : null}
      {completion !== "" ? (
        <div className="flex justify-center">
          <Card className="w-fit max-w-2xl p-4">
            <CardContent>
              <Streamdown>{completion}</Streamdown>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
