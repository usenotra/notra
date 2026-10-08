import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script } from "node:vm";

const source = readFileSync(
  resolve(import.meta.dirname, "../src/components/sites/site-create-form.tsx"),
  "utf8"
);
const handler = source.slice(
  source.indexOf("  const importRepository ="),
  source.indexOf("  const create =")
);
const code = `${handler.replaceAll(": SiteImportableRepository", "").replaceAll(": SiteRepository", "")}\nglobalThis.importRepository = importRepository;`;

for (const rejects of [false, true]) {
  test(`repository import clears its busy state after ${rejects ? "failure" : "success"}`, async () => {
    let importing: string | null = null;
    let picked = false;
    let errorShown = false;
    const connect = {
      mutateAsync: async () => {
        if (rejects) {
          throw new Error("denied");
        }
        return { id: "integration" };
      },
    };
    const importRepository = new Script(code).runInNewContext({
      setImportingId: (value: string | null) => {
        importing = value;
      },
      connect,
      setRepository: () => {
        picked = true;
      },
      setStarterPullRequestUrl: () => {},
      setForm: () => {},
      clearErrors: () => {},
      goTo: () => {},
      id: "form",
      toast: {
        error: () => {
          errorShown = true;
        },
      },
      toErrorMessage: String,
      t: () => "import failed",
    });
    await importRepository({
      githubRepositoryId: "repository",
      integrationId: null,
    });
    expect(importing).toBeNull();
    expect(picked).toBe(!rejects);
    expect(errorShown).toBe(rejects);
  });
}
