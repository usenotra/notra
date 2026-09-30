import { describe, expect, test } from "bun:test";

import { generateText, Output, tool } from "ai";
import { z } from "zod";

import { createDemoLanguageModel } from "../src/router/demo-model";
import { extractDemoAffected } from "../src/utils/demo-affected";
import { demoGitHubFetch } from "../src/utils/demo-github";
import { fakeFromJsonSchema } from "../src/utils/demo-json-schema";

describe("demo JSON schema faker", () => {
  test("produces values the original zod schema accepts", () => {
    const schema = z.object({
      title: z.string().min(3).max(40),
      mentioned: z.boolean(),
      position: z.number().int().min(1).max(5).nullable(),
      sentiment: z.enum(["positive", "neutral", "negative"]),
      competitors: z.array(z.string()).max(4),
      nested: z.object({ url: z.string().url(), tags: z.array(z.string()) }),
    });
    const jsonSchema = z.toJSONSchema(schema);
    const value = fakeFromJsonSchema(jsonSchema as never, "", {
      root: jsonSchema as never,
      seed: "seed",
      german: false,
      depth: 0,
    });
    expect(schema.safeParse(value).success).toBe(true);
  });
});

describe("demo language model", () => {
  const model = createDemoLanguageModel("anthropic/claude-sonnet-5");

  test("answers structured output with a schema-valid object", async () => {
    const schema = z.object({
      headline: z.string(),
      score: z.number().min(0).max(100),
    });
    const result = await generateText({
      model,
      prompt: "Summarize the week",
      output: Output.object({ schema }),
    });
    expect(schema.safeParse(result.output).success).toBe(true);
  });

  test("calls the matching create tool and then answers", async () => {
    const created: string[] = [];
    const result = await generateText({
      model,
      prompt: "Write a LinkedIn post about Smart Search",
      tools: {
        createChangelog: tool({
          inputSchema: z.object({ title: z.string(), markdown: z.string() }),
          execute: async () => "unused",
        }),
        createLinkedInPost: tool({
          inputSchema: z.object({ title: z.string(), markdown: z.string() }),
          execute: async ({ title }) => {
            created.push(title);
            return { status: "created" };
          },
        }),
      },
      stopWhen: ({ steps }) => steps.length >= 3,
    });
    expect(created).toHaveLength(1);
    expect(result.text.length).toBeGreaterThan(0);
  });

  test("replies in German to German questions", async () => {
    const result = await generateText({
      model,
      prompt: "Wie sichtbar sind wir in ChatGPT?",
    });
    expect(result.text).toContain("Sichtbarkeit");
  });
});

describe("demo affected entities", () => {
  test("links the created record and ignores envelope objects", () => {
    const affected = extractDemoAffected(
      "/v1/projects/abc123def/geo/prompts",
      JSON.stringify({
        prompt: { id: "prompt-1", prompt: "Best meeting notes app?" },
        organization: { id: "org-1", name: "Fieldnote" },
      })
    );
    expect(affected).toEqual([
      { type: "geo.prompt", id: "prompt-1", label: "Best meeting notes app?" },
    ]);
  });
});

describe("demo GitHub", () => {
  test("serves reads from the fictional repo and refuses writes", async () => {
    const commits = await demoGitHubFetch(
      "https://api.github.com/repos/fieldnote/fieldnote-app/commits"
    );
    expect(commits.status).toBe(200);
    expect(((await commits.json()) as unknown[]).length).toBeGreaterThan(0);

    const write = await demoGitHubFetch(
      "https://api.github.com/repos/fieldnote/fieldnote-app/pulls",
      { method: "POST" }
    );
    expect(write.status).toBe(403);
  });
});
