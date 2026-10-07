import { NotraMark } from "@/components/notra-mark";
import {
  SLACK_BOT_BADGE_LABEL,
  SLACK_THREAD_CHANNEL,
  SLACK_THREAD_MESSAGES,
  SLACK_THREAD_REPLIES_LABEL,
} from "@/constants/slack-integration";

export function SlackThreadCard() {
  return (
    <div className="flex w-full grow basis-0 flex-col overflow-clip rounded-[1.25rem] bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] lg:w-auto dark:bg-[#17131F] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
      <div className="flex items-center gap-2 px-5 py-3.5 [box-shadow:#F0F0F0_0_-0.0625rem_0_inset] dark:[box-shadow:#FFFFFF14_0_-0.0625rem_0_inset]">
        <img
          decoding="async"
          loading="lazy"
          alt="Slack logo"
          className="size-4 shrink-0"
          height={16}
          src="/logos/slack.svg"
          width={16}
        />
        <span className="font-sans text-sm leading-[1.125rem] font-semibold text-[#1264A3] dark:text-[#7CC1E8]">
          {SLACK_THREAD_CHANNEL}
        </span>
        <span className="font-sans text-xs leading-4 text-[#1E1E1E66] dark:text-white/40">
          {SLACK_THREAD_REPLIES_LABEL}
        </span>
      </div>
      <div className="flex flex-col gap-3.5 px-5 py-4">
        {SLACK_THREAD_MESSAGES.map((threadMessage) => (
          <div className="flex gap-2.5" key={threadMessage.author}>
            {threadMessage.isBot ? (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#F6F3F1] ring-1 ring-[#1E1E1E14] dark:ring-white/10">
                <NotraMark className="size-4.5 shrink-0" />
              </span>
            ) : (
              <div
                className="size-7 shrink-0 rounded-lg"
                style={{ backgroundImage: threadMessage.avatarGradient }}
              />
            )}
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5">
                <span className="font-sans text-[0.8125rem] leading-4 font-semibold text-[#1E1E1E] dark:text-white">
                  {threadMessage.author}
                </span>
                {threadMessage.isBot ? (
                  <span className="rounded-[0.25rem] bg-[#1E1E1E0F] px-1 py-px font-sans text-[0.625rem] leading-3 font-semibold text-[#1E1E1E99] dark:bg-white/10 dark:text-white/60">
                    {SLACK_BOT_BADGE_LABEL}
                  </span>
                ) : null}
              </span>
              <span className="font-sans text-[0.8125rem] leading-[1.125rem] text-[#1E1E1EBF] dark:text-white/75">
                {threadMessage.mention ? (
                  <>
                    <span className="rounded-[0.25rem] bg-[#1D9BD126] px-0.5 font-medium text-[#1264A3] dark:bg-[#1D9BD129] dark:text-[#7CC1E8]">
                      {threadMessage.mention}
                    </span>{" "}
                  </>
                ) : null}
                {threadMessage.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
