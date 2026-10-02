import { Tweet } from "react-tweet";

import { MERCH_TWEET_IDS } from "@/constants/merch";

export function MerchTweets() {
  return (
    <section className="w-full px-6 pt-28 lg:pt-32">
      <div className="mx-auto flex w-full max-w-[80rem] flex-col items-center gap-8">
        <h2 className="font-display max-w-[50rem] text-center text-[2rem] leading-[1.14] font-medium tracking-[-0.02em] text-[#1E1E1E] sm:text-[2.875rem] dark:text-white">
          Spotted in the <span className="text-primary">wild</span>.
        </h2>
        <div className="grid w-full grid-cols-1 items-start gap-4 md:grid-cols-3">
          {MERCH_TWEET_IDS.map((id) => (
            <div
              className="flex justify-center [&_.react-tweet-theme]:my-0 [&_[class*='quoted-tweet']]:hidden [&_[class*='tweet-replies']]:hidden"
              key={id}
            >
              <Tweet id={id} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
