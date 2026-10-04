import { beforeAll, expect, test } from "bun:test";

let prepareGitHubContentAssets: typeof import("./content-assets").prepareGitHubContentAssets;

beforeAll(async () => {
  ({ prepareGitHubContentAssets } = await import("./content-assets"));
});

const KEY = "organization/org_1/content/abc123.png";
const SECOND_KEY = "organization/org_1/content/def456.jpg";
const VIDEO_KEY = "organization/org_1/content/clip123.mp4";

test("puts uploaded media in the pull request and leaves the rest as links", async () => {
  const png = new Uint8Array([1, 2, 3]);
  const jpg = new Uint8Array([4]);
  const mp4 = new Uint8Array([5]);
  const imageUrl = `/api/uploads/content-images/${KEY}`;
  const videoUrl = `/api/uploads/content-images/${VIDEO_KEY}`;
  const prepared = await prepareGitHubContentAssets({
    appOrigin: "https://app.usenotra.com",
    contentPath: "blog/hello-world.md",
    imagePathTemplate: "public/blog/:slug/image",
    loadImage: async (key) => {
      expect(key.startsWith("organization/org_1/")).toBe(true);
      if (key === VIDEO_KEY) {
        return { contents: mp4, extension: ".mp4" };
      }
      return {
        contents: key === KEY ? png : jpg,
        extension: key.endsWith(".jpg") ? ".jpg" : ".png",
      };
    },
    markdown: [
      `![Cover](https://cdn.example/organization/org_1/content/abc123.png)`,
      `![Shot](https://cdn.example/${KEY})`,
      "![Remote](https://example.com/remote.png)",
      `![Other](https://cdn.example/organization/org_2/content/other.png)`,
      `![Second](https://cdn.example/${SECOND_KEY})`,
      `<video controls src="${videoUrl}"></video>`,
      "```",
      `<video controls src="${videoUrl}"></video>`,
      "```",
      `![Local](${imageUrl})`,
    ].join("\n"),
    organizationId: "org_1",
    publicUrl: "https://cdn.example",
    slug: "hello-world",
  });

  expect(prepared.assets.map((asset) => asset.path)).toEqual([
    "public/blog/hello-world/image-abc123.png",
    "public/blog/hello-world/image-def456.jpg",
    "public/blog/hello-world/image-clip123.mp4",
  ]);
  expect(prepared.markdown).toContain(
    "![Cover](/blog/hello-world/image-abc123.png)"
  );
  expect(prepared.markdown).toContain(
    "![Shot](/blog/hello-world/image-abc123.png)"
  );
  expect(prepared.markdown).toContain(
    "![Local](/blog/hello-world/image-abc123.png)"
  );
  expect(prepared.markdown).toContain(
    "![Remote](https://example.com/remote.png)"
  );
  expect(prepared.markdown).toContain(
    "![Other](https://cdn.example/organization/org_2/content/other.png)"
  );
  expect(prepared.markdown).toContain(
    "![Second](/blog/hello-world/image-def456.jpg)"
  );
  expect(prepared.markdown).toContain(
    '<video controls src="/blog/hello-world/image-clip123.mp4"></video>'
  );
  expect(prepared.markdown).toContain(
    `\`\`\`\n<video controls src="${videoUrl}"></video>\n\`\`\``
  );
});
