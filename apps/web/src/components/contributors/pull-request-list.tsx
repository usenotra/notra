import Image from "next/image";
import Link from "next/link";
import type { GitHubPR } from "~types/github";

import { formatGitHubDate } from "@/utils/github";

export function PullRequestList({ prs }: { prs: GitHubPR[] }) {
  if (prs.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
        No open pull requests at the moment
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {prs.map((pr) => (
        <Link
          className="group border-border/60 bg-card hover:border-border duration-normal block rounded-lg border p-4 transition-all hover:shadow-sm"
          href={pr.html_url}
          key={pr.id}
          rel="noopener noreferrer"
          target="_blank"
        >
          <div className="flex items-start gap-3">
            <Image
              alt={`Avatar of ${pr.user.login}`}
              className="mt-0.5 size-6 flex-shrink-0 rounded-full"
              height={48}
              src={pr.user.avatar_url}
              width={48}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    pr.draft
                      ? "bg-warning/10 text-warning"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {pr.draft ? "Draft" : "Ready"}
                </span>
                <span className="text-muted-foreground text-xs">
                  #{pr.number}
                </span>
              </div>
              <span className="text-foreground group-hover:text-primary line-clamp-2 font-sans text-sm font-medium transition-colors">
                {pr.title}
              </span>
              <p className="text-muted-foreground mt-1 text-xs">
                by {pr.user.login} • {formatGitHubDate(pr.created_at)}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
