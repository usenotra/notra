import { describe, expect, test } from "bun:test";

import { generateText, Output, stepCountIs, tool } from "ai";
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

  test("answers brand analysis with a coherent profile", async () => {
    const schema = z.object({
      companyName: z.string(),
      companyDescription: z.string(),
      toneProfile: z.enum(["Conversational", "Professional"]),
      audience: z.string(),
      language: z.enum(["English", "German"]),
    });
    const { output } = await generateText({
      model: createDemoLanguageModel("demo"),
      output: Output.object({ schema }),
      prompt: "Analyze this website",
    });
    expect(output.language).toBe("English");
    expect(output.audience).toMatch(/product/i);
    expect(output.companyDescription).toContain("meeting notes");
  });

  test("generates personas that meet the two-word role rule", async () => {
    const schema = z.object({
      personas: z
        .array(
          z.object({
            name: z.string().min(1),
            role: z.string().regex(/^\S+(?:\s+\S+)?$/),
            conversationPrompts: z.array(z.string()).min(2),
          })
        )
        .min(5),
    });
    const { output } = await generateText({
      model: createDemoLanguageModel("demo"),
      output: Output.object({ schema }),
      prompt: "Generate personas",
    });
    expect(output.personas).toHaveLength(5);
  });

  test("names a new project after the analyzed domain", async () => {
    const schema = z.object({
      companyName: z.string(),
      aliases: z.array(z.string()).max(6),
      audienceType: z.enum(["technical", "general", "commerce"]),
      competitors: z.array(
        z.object({ name: z.string(), domain: z.string().nullable() })
      ),
      prompts: z
        .array(z.object({ prompt: z.string(), title: z.string() }))
        .min(6)
        .max(10),
      conversations: z
        .array(z.object({ name: z.string(), steps: z.array(z.string()) }))
        .max(3),
    });
    const { output } = await generateText({
      model: createDemoLanguageModel("demo"),
      output: Output.object({ schema }),
      prompt: "Analyze https://linear.app and its homepage",
    });
    expect(output.companyName).toBe("Linear");
    expect(output.aliases).toEqual(["Linear"]);
  });

  test("plans a brief around the requested topic", async () => {
    const schema = z.object({
      targetPrompt: z.string(),
      workingTitle: z.string().max(120),
      sections: z
        .array(z.object({ heading: z.string(), goal: z.string() }))
        .min(3),
    });
    const { output } = await generateText({
      model: createDemoLanguageModel("demo"),
      output: Output.object({ schema }),
      prompt:
        "<brand>\nName: Fieldnote\n</brand>\n<topic>\ntracking decisions across meetings\n</topic>",
    });
    expect(output.workingTitle).toContain("Tracking decisions across meetings");
    expect(
      new Set(output.sections.map((section) => section.heading)).size
    ).toBe(output.sections.length);
  });

  test("the GEO writer researches before saving every brief section", async () => {
    const calls: string[] = [];
    let saved = "";
    await generateText({
      model: createDemoLanguageModel("demo"),
      system:
        "<brief>\n1. ## Why search beats transcripts\n2. ## Setting it up\n</brief>",
      prompt:
        'Research with webSearch first, then write the article "Searchable meetings".',
      stopWhen: stepCountIs(5),
      tools: {
        webSearch: tool({
          inputSchema: z.object({ query: z.string() }),
          execute: async () => {
            calls.push("webSearch");
            return { results: [] };
          },
        }),
        createBlogPost: tool({
          inputSchema: z.object({ title: z.string(), markdown: z.string() }),
          execute: async (input) => {
            calls.push("createBlogPost");
            saved = input.markdown;
            return { ok: true };
          },
        }),
      },
    });
    expect(calls).toEqual(["webSearch", "createBlogPost"]);
    expect(saved).toContain("## Why search beats transcripts");
    expect(saved).toContain("## Setting it up");
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

  test("lists branches with main first", async () => {
    const response = await demoGitHubFetch(
      "https://api.github.com/repos/fieldnote/fieldnote-app/branches?per_page=100&page=1"
    );
    expect(response.status).toBe(200);
    const branches = (await response.json()) as Array<{ name: string }>;
    expect(branches[0]?.name).toBe("main");
    expect(branches.length).toBeGreaterThan(1);

    const nextPage = await demoGitHubFetch(
      "https://api.github.com/repos/fieldnote/fieldnote-app/branches?per_page=100&page=2"
    );
    expect(await nextPage.json()).toEqual([]);
  });

  test("browses folders and files through the contents API", async () => {
    const base =
      "https://api.github.com/repos/fieldnote/fieldnote-app/contents";
    const root = (await (await demoGitHubFetch(base)).json()) as Array<{
      name: string;
      type: string;
    }>;
    const rootFolders = root
      .filter((entry) => entry.type === "dir")
      .map((entry) => entry.name);
    expect(rootFolders).toEqual(
      expect.arrayContaining(["blog", "changelogs", "docs", "src"])
    );

    const nested = await demoGitHubFetch(`${base}/docs%2Fguides?ref=main`);
    expect(nested.status).toBe(200);
    const guides = (await nested.json()) as Array<{ path: string }>;
    expect(guides.map((entry) => entry.path)).toContain(
      "docs/guides/templates.md"
    );

    const file = await demoGitHubFetch(`${base}/README.md`);
    expect(Array.isArray(await file.json())).toBe(false);

    const missing = await demoGitHubFetch(`${base}/does-not-exist`);
    expect(missing.status).toBe(404);
  });
});
