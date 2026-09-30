import { beforeAll, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

let prepareGitHubContentAssets: typeof import("./content-assets").prepareGitHubContentAssets;
let resolveGitHubImagePathTemplate: typeof import("./content-assets").resolveGitHubImagePathTemplate;

beforeAll(async () => {
  ({ prepareGitHubContentAssets, resolveGitHubImagePathTemplate } =
    await import("./content-assets"));
});

const KEY = "organization/org_1/content/abc123.png";
const SECOND_KEY = "organization/org_1/content/def456.jpg";
const VIDEO_KEY = "organization/org_1/content/clip123.mp4";

test("defaults the image path to the markdown file name", () => {
  expect(resolveGitHubImagePathTemplate("blog/hello-world.md", null)).toBe(
    "blog/hello-world"
  );
  expect(
    resolveGitHubImagePathTemplate(
      "blog/hello-world.md",
      "public/blog/:slug/image"
    )
  ).toBe("public/blog/:slug/image");
});

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

test("keeps GitHub asset paths when markdown order changes", async () => {
  const loadImage = async (key: string) => ({
    contents: new Uint8Array([1]),
    extension: key.endsWith(".jpg") ? ".jpg" : ".png",
  });
  const first = await prepareGitHubContentAssets({
    appOrigin: null,
    contentPath: "blog/hello-world.md",
    imagePathTemplate: "public/blog/:slug/image",
    loadImage,
    markdown: `![A](https://cdn.example/${KEY})\n![B](https://cdn.example/${SECOND_KEY})`,
    organizationId: "org_1",
    publicUrl: "https://cdn.example",
    slug: "hello-world",
  });
  const reordered = await prepareGitHubContentAssets({
    appOrigin: null,
    contentPath: "blog/hello-world.md",
    imagePathTemplate: "public/blog/:slug/image",
    loadImage,
    markdown: `![B](https://cdn.example/${SECOND_KEY})\n![A](https://cdn.example/${KEY})`,
    organizationId: "org_1",
    publicUrl: "https://cdn.example",
    slug: "hello-world",
  });
  expect(first.assets.map((asset) => asset.path).toSorted()).toEqual(
    reordered.assets.map((asset) => asset.path).toSorted()
  );
  expect(reordered.markdown).toContain(
    "![A](/blog/hello-world/image-abc123.png)"
  );
  expect(reordered.markdown).toContain(
    "![B](/blog/hello-world/image-def456.jpg)"
  );
});

test("does not treat data-src as the video source", async () => {
  const videoUrl = `/api/uploads/content-images/${VIDEO_KEY}`;
  const prepared = await prepareGitHubContentAssets({
    appOrigin: "https://app.usenotra.com",
    contentPath: "blog/hello-world.md",
    imagePathTemplate: "public/blog/:slug/image",
    loadImage: async () => ({
      contents: new Uint8Array([5]),
      extension: ".mp4",
    }),
    markdown: `<video data-src="${videoUrl}" src="https://example.com/poster.mp4"></video>`,
    organizationId: "org_1",
    publicUrl: null,
    slug: "hello-world",
  });
  expect(prepared.assets).toEqual([]);
  expect(prepared.markdown).toContain(`data-src="${videoUrl}"`);
  expect(prepared.markdown).toContain('src="https://example.com/poster.mp4"');
});
