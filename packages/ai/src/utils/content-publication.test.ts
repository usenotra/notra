import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// This is deliberately an in-memory Drizzle transaction/row-lock simulation,
// not a PostgreSQL integration test. Keep it isolated from .env databases.
if (process.env.NOTRA_CONTENT_PUBLICATION_TEST_WORKER !== "1") {
  test("content publication synchronization regressions (in-memory adapter)", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_CONTENT_PUBLICATION_TEST_WORKER: "1" },
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  type Publication = {
    id: string;
    organizationId: string;
    postId: string;
    headSha: string | null;
    status: string;
    branch: string;
  };
  type State = { publication: Publication; markdown: string; title?: string };

  let state: State;
  let events: string[];
  let unlock = () => {};
  let locked = false;
  const waiters: Array<() => void> = [];

  const acquire = async () => {
    if (locked) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
    locked = true;
    unlock = () => {
      locked = false;
      waiters.shift()?.();
    };
  };

  const chain = (value: () => unknown, label?: string) => {
    const builder: Record<string, (...args: unknown[]) => unknown> = {};
    for (const method of ["from", "where"]) {
      builder[method] = () => {
        return builder;
      };
    }
    builder.for = async () => {
      if (label) {
        events.push(label);
      }
      return value();
    };
    return builder;
  };

  const tx = {
    select: (selection: Record<string, unknown>) =>
      Object.keys(selection).includes("headSha")
        ? chain(
            () =>
              state.publication.status === "open"
                ? [
                    {
                      id: state.publication.id,
                      headSha: state.publication.headSha,
                    },
                  ]
                : [],
            "publication-lock"
          )
        : chain(() => [{ id: state.publication.postId }], "post-lock"),
    update: () => ({
      set: (patch: Partial<Publication>) => ({
        where: async () => {
          events.push("publication-update");
          Object.assign(state.publication, patch);
        },
      }),
    }),
  };

  const db = {
    query: {
      contentPublications: {
        findFirst: async () => {
          events.push("snapshot");
          return {
            headSha: state.publication.headSha,
            status: state.publication.status,
          };
        },
      },
    },
    transaction: async <T>(run: (database: typeof tx) => Promise<T>) => {
      await acquire();
      const before = structuredClone(state);
      try {
        return await run(tx);
      } catch (error) {
        state = before;
        throw error;
      } finally {
        unlock();
      }
    },
  };

  mock.module("@notra/db/drizzle", () => ({ db }));
  mock.module("@notra/ai/utils/post-service", () => ({
    updatePostRecord: async (params: { markdown: string; title?: string }) => {
      events.push("post-update");
      state.markdown = params.markdown;
      state.title = params.title;
      return { status: "updated" };
    },
  }));

  const { syncContentPublication } = await import("./content-publication");
  const repair = (commitSha: string, markdown = commitSha) => ({
    organizationId: "org",
    publicationId: "publication",
    postId: "post",
    baselineHeadSha: "h0" as string | null,
    expectedHeadSha: "h0",
    commitSha,
    branch: "content",
    markdown,
  });
  const reset = (headSha: string | null = "h0", status = "open") => {
    state = {
      publication: {
        id: "publication",
        organizationId: "org",
        postId: "post",
        headSha,
        status,
        branch: "content",
      },
      markdown: "h0",
    };
    events = [];
  };

  test("stored H0 advances across manual H1 to descendant H2 using actual ancestry guard", async () => {
    reset();
    const comparisons: string[] = [];
    expect(
      await syncContentPublication(repair("h2"), async (base, head) => {
        comparisons.push(`${base}->${head}`);
        return base === "h0" && head === "h2";
      })
    ).toEqual({ status: "synchronized", markdown: "h2" });
    expect(comparisons).toEqual(["h0->h2"]);
    expect(state.publication.headSha).toBe("h2");
    expect(events).toEqual([
      "snapshot",
      "post-lock",
      "publication-lock",
      "post-update",
      "publication-update",
    ]);
  });

  test("unrelated intermediary is rejected before transaction writes", async () => {
    reset("manual-unrelated");
    expect(
      await syncContentPublication(repair("h2"), async () => false)
    ).toEqual({ status: "superseded" });
    expect(events).toEqual(["snapshot"]);
    expect(state.markdown).toBe("h0");
  });

  test("null is an explicit baseline and skips ancestry comparison", async () => {
    reset(null);
    let compared = false;
    expect(
      await syncContentPublication(
        { ...repair("h1"), baselineHeadSha: null },
        async () => {
          compared = true;
          return false;
        }
      )
    ).toEqual({ status: "synchronized", markdown: "h1" });
    expect(compared).toBe(false);
  });

  test.each([
    ["a", "b"],
    ["b", "a"],
  ])(
    "concurrent %s then %s rechecks the locked current revision",
    async (firstSha, secondSha) => {
      reset();
      let arrivals = 0;
      let release!: () => void;
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      const ancestry = async () => {
        arrivals++;
        if (arrivals === 2) {
          release();
        }
        await barrier;
        return true;
      };
      const first = syncContentPublication(repair(firstSha), ancestry);
      const second = syncContentPublication(repair(secondSha), ancestry);
      const results = await Promise.all([first, second]);
      expect(results.map((result) => result.status).sort()).toEqual([
        "retry",
        "synchronized",
      ]);
      expect(state.publication.headSha).toBe(firstSha);
      expect(events.filter((event) => event === "post-update")).toHaveLength(1);
    }
  );

  test("latest revision makes a stale repair superseded", async () => {
    reset();
    expect(
      (await syncContentPublication(repair("h2"), async () => true)).status
    ).toBe("synchronized");
    expect(
      await syncContentPublication(
        repair("h1"),
        async (base, head) => base === "h0" && head === "h1"
      )
    ).toEqual({ status: "superseded" });
    expect(state.publication.headSha).toBe("h2");
    expect(state.markdown).toBe("h2");
  });

  test("retired mapping never enters the transaction or updates the post", async () => {
    reset("h0", "closed");
    expect(
      await syncContentPublication(repair("h1"), async () => true)
    ).toEqual({ status: "superseded" });
    expect(events).toEqual(["snapshot"]);
    expect(state.markdown).toBe("h0");
  });
}
