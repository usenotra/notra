import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { useQueryState } from "nuqs";
import { type FormEvent, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { GitHubMark } from "@/components/star-video/github-mark";
import {
  buildGithubConnectHref,
  getGithubLogin,
  getServerGithubLogin,
  subscribeToGithubConnection,
} from "@/lib/star-video/github-connection";
import { parseRepoInput } from "@/lib/star-video/parse-repo";

const DEFAULT_INPUT = "usenotra/notra";
const AVATAR_SIZE_PX = 40;

export function RepoInputForm() {
  const [repoParam, setRepoParam] = useQueryState("repo");
  const [value, setValue] = useState(repoParam ?? DEFAULT_INPUT);
  const githubLogin = useSyncExternalStore(
    subscribeToGithubConnection,
    getGithubLogin,
    getServerGithubLogin
  );
  const githubConnected = githubLogin !== null;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseRepoInput(value);
    if (!parsed) {
      toast.error("Enter a repo as owner/name or a GitHub URL.");
      return;
    }
    const repoId = `${parsed.owner}/${parsed.repo}`.toLowerCase();
    if (!githubConnected) {
      window.location.assign(buildGithubConnectHref(repoId));
      return;
    }
    setRepoParam(repoId);
  };

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <form
        className="flex w-full max-w-[35rem] flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2.5 sm:rounded-full sm:bg-white sm:py-2.5 sm:pr-2.5 sm:pl-5 sm:[box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] dark:sm:bg-white/[0.06] dark:sm:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]"
        onSubmit={onSubmit}
      >
        <div className="flex min-w-0 grow items-center gap-2.5 rounded-full bg-white px-5 py-3 [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] sm:bg-transparent sm:p-0 sm:[box-shadow:none] dark:bg-white/[0.06] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem] dark:sm:bg-transparent dark:sm:[box-shadow:none]">
          <GitHubMark className="size-4.5 shrink-0 text-[#1E1E1E80] dark:text-white/50" />
          <input
            aria-label="GitHub repository"
            className="w-full min-w-0 bg-transparent font-sans text-[1rem] leading-[1.25] tracking-[-0.01em] text-[#1E1E1E] outline-none placeholder:text-[#1E1E1E66] dark:text-white dark:placeholder:text-white/40"
            onChange={(event) => setValue(event.target.value)}
            placeholder="owner/name"
            value={value}
          />
        </div>
        <CtaButton
          className="h-auto px-5 py-3 font-sans text-[0.9375rem] leading-[1.29] font-semibold sm:px-4.5 sm:py-2 sm:text-[0.875rem]"
          type="submit"
          variant="flat"
        >
          {githubConnected ? "Generate video" : "Connect GitHub"}
        </CtaButton>
      </form>
      <p className="font-sans text-sm text-[#1E1E1E99] dark:text-white/60">
        {githubLogin ? (
          <span className="inline-flex items-center gap-1.5">
            Connected as
            <img
              decoding="async"
              loading="lazy"
              alt=""
              className="size-4 rounded-full"
              height={AVATAR_SIZE_PX}
              src={`https://avatars.githubusercontent.com/${githubLogin}?size=${AVATAR_SIZE_PX}`}
              width={AVATAR_SIZE_PX}
            />
            <span className="font-semibold text-[#1E1E1E] dark:text-white">
              {githubLogin}
            </span>
          </span>
        ) : (
          "A GitHub connection is required to look up repos and render the video."
        )}
      </p>
    </div>
  );
}
