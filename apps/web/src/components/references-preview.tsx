import {
  Comment01Icon,
  FavouriteIcon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface MockTweet {
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  date: string;
  platforms: string[];
}

const TRAILING_ZERO_REGEX = /\.0$/;

const MOCK_TWEET: MockTweet = {
  authorName: "Dominik Koch",
  authorHandle: "dominikkoch",
  authorAvatar: "https://avatars.githubusercontent.com/u/68947960?s=200&v=4",
  content:
    "Just shipped our biggest update yet. Real-time collab, revamped dashboard and 3x faster sync.\n\nHonestly can't believe how far we've come in 6 months.",
  likes: 847,
  retweets: 92,
  replies: 31,
  date: "Mar 8",
  platforms: ["Twitter"],
};

function formatCompactNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(TRAILING_ZERO_REGEX, "")}K`;
  }
  return String(num);
}

function MockReferenceCard({ tweet }: { tweet: MockTweet }) {
  return (
    <div className="border-border/80 flex break-inside-avoid flex-col overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <img
              decoding="async"
              loading="lazy"
              alt={tweet.authorName}
              className="size-9 shrink-0 rounded-full object-cover"
              height={36}
              src={tweet.authorAvatar}
              width={36}
            />
            <div className="min-w-0">
              <span className="truncate text-sm leading-tight font-semibold">
                {tweet.authorName}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground truncate text-xs">
                  @{tweet.authorHandle}
                </span>
                <span className="text-muted-foreground/50 text-xs">·</span>
                <span className="text-muted-foreground/70 shrink-0 text-xs">
                  {tweet.date}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {tweet.platforms.map((platform) => (
              <span
                className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[0.6875rem]"
                key={platform}
              >
                {platform}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
          {tweet.content}
        </p>

        <div className="flex items-center gap-3 pt-0.5">
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <HugeiconsIcon className="size-3.5" icon={Comment01Icon} />
            {formatCompactNumber(tweet.replies)}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <HugeiconsIcon className="size-3.5" icon={RepeatIcon} />
            {formatCompactNumber(tweet.retweets)}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <HugeiconsIcon className="size-3.5" icon={FavouriteIcon} />
            {formatCompactNumber(tweet.likes)}
          </span>
        </div>
      </div>

      <div className="bg-muted/50 border-t px-4 py-2.5">
        <span className="text-muted-foreground/50 text-xs">Add a note...</span>
      </div>
    </div>
  );
}

export default function ReferencesPreview() {
  return (
    <div className="relative overflow-hidden">
      <div className="pt-2">
        <MockReferenceCard tweet={MOCK_TWEET} />
      </div>

      <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b to-transparent" />
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t to-transparent" />
    </div>
  );
}
