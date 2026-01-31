import { serve } from "@upstash/workflow/nextjs";
import type { WorkflowContext } from "@upstash/workflow";
import { db } from "@notra/db/drizzle";
import {
  contentTriggers,
  posts,
  githubRepositories,
  githubIntegrations,
} from "@notra/db/schema";
import { eq, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { createGithubChangelogAgent } from "@/lib/ai/agents/changelog";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);

type SchedulePayload = {
  triggerId: string;
};

type TriggerData = {
  id: string;
  organizationId: string;
  sourceType: string;
  sourceConfig: unknown;
  targets: { repositoryIds: string[] };
  outputType: string;
  outputConfig: unknown;
  enabled: boolean;
};

type RepositoryData = {
  id: string;
  owner: string;
  repo: string;
  integrationId: string;
};

type GeneratedContent = {
  title: string;
  markdown: string;
};

export const { POST } = serve<SchedulePayload>(
  async (context: WorkflowContext<SchedulePayload>) => {
    const { triggerId } = context.requestPayload;

    // Step 1: Fetch trigger configuration
    const trigger = await context.run<TriggerData | null>(
      "fetch-trigger",
      async () => {
        const result = await db.query.contentTriggers.findFirst({
          where: eq(contentTriggers.id, triggerId),
        });

        if (!result) {
          return null;
        }

        return {
          id: result.id,
          organizationId: result.organizationId,
          sourceType: result.sourceType,
          sourceConfig: result.sourceConfig,
          targets: result.targets as { repositoryIds: string[] },
          outputType: result.outputType,
          outputConfig: result.outputConfig,
          enabled: result.enabled,
        };
      }
    );

    if (!trigger) {
      console.log(`[Schedule] Trigger ${triggerId} not found, canceling`);
      await context.cancel();
      return;
    }

    if (!trigger.enabled) {
      console.log(`[Schedule] Trigger ${triggerId} is disabled, canceling`);
      await context.cancel();
      return;
    }

    // Step 2: Fetch repository data for targets
    const repositories = await context.run<RepositoryData[]>(
      "fetch-repositories",
      async () => {
        const repositoryIds = trigger.targets.repositoryIds;

        if (repositoryIds.length === 0) {
          return [];
        }

        const repos = await db
          .select({
            id: githubRepositories.id,
            owner: githubRepositories.owner,
            repo: githubRepositories.repo,
            integrationId: githubRepositories.integrationId,
          })
          .from(githubRepositories)
          .innerJoin(
            githubIntegrations,
            eq(githubRepositories.integrationId, githubIntegrations.id)
          )
          .where(inArray(githubRepositories.id, repositoryIds));

        return repos;
      }
    );

    if (repositories.length === 0) {
      console.log(`[Schedule] No valid repositories for trigger ${triggerId}, canceling`);
      await context.cancel();
      return;
    }

    // Step 3: Generate content based on output type
    const content = await context.run<GeneratedContent>(
      "generate-content",
      async () => {
        if (trigger.outputType === "changelog") {
          // Use the changelog agent to generate content
          const agent = createGithubChangelogAgent(trigger.organizationId);

          // Build prompt with repository context
          const repoList = repositories
            .map((r) => `${r.owner}/${r.repo}`)
            .join(", ");
          const prompt = `Generate a changelog for the following repositories: ${repoList}.
          Look at the commits from the last 7 days and create a comprehensive, human-readable changelog.
          Return the result in markdown format with a clear title.`;

          const result = await agent.generate({
            prompt,
          });

          // Extract title from first heading or use default
          const markdown = result.text;
          const titleMatch = markdown.match(/^#\s+(.+)$/m);
          const title =
            titleMatch?.[1] ?? `Changelog - ${new Date().toLocaleDateString()}`;

          return {
            title,
            markdown,
          };
        }

        // For other output types, log and return placeholder
        console.log(
          `[Schedule] Output type ${trigger.outputType} not fully implemented yet`
        );

        return {
          title: `${trigger.outputType} - ${new Date().toLocaleDateString()}`,
          markdown: `*Automated ${trigger.outputType} generation is coming soon.*\n\nRepositories: ${repositories.map((r) => `${r.owner}/${r.repo}`).join(", ")}`,
        };
      }
    );

    // Step 4: Save post to database
    const postId = await context.run<string>("save-post", async () => {
      const id = nanoid();

      await db.insert(posts).values({
        id,
        organizationId: trigger.organizationId,
        title: content.title,
        content: content.markdown,
        markdown: content.markdown,
        contentType: trigger.outputType,
      });

      return id;
    });

    console.log(`[Schedule] Created post ${postId} for trigger ${triggerId}`);

    return { success: true, triggerId, postId };
  },
  {
    baseUrl:
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined),
    failureFunction: async ({ context, failStatus, failResponse }) => {
      console.error(
        `[Schedule] Workflow failed for trigger ${context.requestPayload.triggerId}:`,
        { status: failStatus, response: failResponse }
      );
    },
  }
);
