import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@vercel/og";

import bgDataUrl from "@/../public/marketing/chat-bg.jpg?inline";
import notraSvg from "@/../public/notra-mark.svg?raw";
import { marketingChatOgQuerySchema } from "@/schemas/marketing-chat";
import { loadInterFont } from "@/utils/og";

const SIZE = { width: 1200, height: 630 };
const WHITESPACE_REGEX = /\s+/;

const SUGGESTIONS = [
  {
    title: "Blog article",
    prompt:
      "Help me write a blog post. Ask me 1-2 questions about the topic and audience before drafting.",
  },
  {
    title: "Release notes",
    prompt:
      "Help me draft a changelog. Ask me what changed and which release or repo to reference.",
  },
  {
    title: "Tweet",
    prompt:
      "Help me write a Twitter post. Ask me about the topic and angle before drafting.",
  },
  {
    title: "LinkedIn post",
    prompt:
      "Help me write a LinkedIn post. Ask me about the topic and audience before drafting.",
  },
];

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function formatLongDate(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
}

function BrainIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="14"
      stroke="rgba(15,15,15,0.85)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 5a3 3 0 1 0-5.997.142A4 4 0 0 0 4 9.5 4 4 0 0 0 6 13a4 4 0 0 0 0 7 4 4 0 0 0 6-1V5Z" />
      <path d="M12 5a3 3 0 1 1 5.997.142A4 4 0 0 1 20 9.5 4 4 0 0 1 18 13a4 4 0 0 1 0 7 4 4 0 0 1-6-1V5Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="13"
      stroke="rgba(15,15,15,0.55)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="13"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="14"
      stroke="rgba(15,15,15,0.7)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width="14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16.5 6.5 9.5 13.5a2.5 2.5 0 0 0 3.54 3.54l8.49-8.49a4.5 4.5 0 1 0-6.36-6.36L6.18 10.7a6.5 6.5 0 0 0 9.19 9.19" />
    </svg>
  );
}

async function GET(request: Request) {
  const rawName = new URL(request.url).searchParams.get("name");
  const parsed = marketingChatOgQuerySchema.safeParse({
    name: rawName ?? undefined,
  });

  if (!parsed.success) {
    return new Response("Invalid query params", { status: 400 });
  }

  const firstName = parsed.data.name?.split(WHITESPACE_REGEX)[0];

  const now = new Date();
  const dateStr = formatLongDate(now);
  const greeting = getGreeting(now);
  const headline = firstName ? `${greeting}, ${firstName}` : greeting;

  const [interRegular, interMedium, interSemibold] = await Promise.all([
    loadInterFont(400),
    loadInterFont(500),
    loadInterFont(600),
  ]);

  const notraDataUrl = `data:image/svg+xml;base64,${Buffer.from(notraSvg).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundImage: `url(${bgDataUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "Inter",
        color: "#0a0a0a",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          border: "1px solid rgba(0, 0, 0, 0.06)",
          boxShadow: "0 24px 80px rgba(20, 20, 30, 0.22)",
          padding: "36px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "560px",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                color: "rgba(15, 15, 15, 0.55)",
                fontSize: "12px",
                lineHeight: "16px",
              }}
            >
              {dateStr}
            </div>
            <div
              style={{
                color: "#0a0a0a",
                fontSize: "26px",
                lineHeight: "34px",
                fontWeight: 600,
                letterSpacing: "-0.025em",
              }}
            >
              {headline}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "14px",
              boxShadow:
                "0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)",
              padding: "2px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: "13px",
                backgroundColor: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  padding: "10px 12px",
                  minHeight: "48px",
                  color: "rgba(15, 15, 15, 0.45)",
                  fontSize: "14px",
                  lineHeight: "24px",
                }}
              >
                Send a message... (type @ to add context)
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "30px",
                    padding: "0 10px",
                    backgroundColor: "#f5f5f5",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    borderRadius: "8px",
                    color: "#0a0a0a",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  <BrainIcon />
                  <span>Medium</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "30px",
                    padding: "0 10px",
                    backgroundColor: "#f5f5f5",
                    border: "1px solid rgba(0, 0, 0, 0.08)",
                    borderRadius: "8px",
                    color: "#0a0a0a",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  {/* biome-ignore lint/performance/noImgElement: next/og JSX requires native img */}
                  <img alt="" height={14} src={notraDataUrl} width={14} />
                  <span>Auto</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "30px",
                    padding: "0 10px",
                    border: "1px dashed rgba(0, 0, 0, 0.18)",
                    borderRadius: "8px",
                    color: "rgba(15, 15, 15, 0.6)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  <PlusIcon />
                  <span>Add context</span>
                </div>

                <div
                  style={{ display: "flex", marginLeft: "auto", gap: "6px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "28px",
                      height: "28px",
                      backgroundColor: "#f5f5f5",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      borderRadius: "8px",
                    }}
                  >
                    <PaperclipIcon />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      height: "28px",
                      padding: "0 10px",
                      backgroundColor: "#f5f5f5",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      borderRadius: "8px",
                      color: "#0a0a0a",
                      fontSize: "13px",
                    }}
                  >
                    <span>Send</span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "16px",
                        minWidth: "16px",
                        padding: "0 4px",
                        border: "1px solid rgba(0, 0, 0, 0.1)",
                        borderRadius: "4px",
                        backgroundColor: "#ffffff",
                        color: "rgba(15, 15, 15, 0.55)",
                        fontSize: "10px",
                      }}
                    >
                      ↵
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              borderTop: "1px solid rgba(0, 0, 0, 0.1)",
              borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            {SUGGESTIONS.map((s, i) => (
              <div
                key={s.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "10px 4px",
                  borderTop: i === 0 ? "none" : "1px solid rgba(0, 0, 0, 0.1)",
                }}
              >
                <div
                  style={{
                    color: "rgba(10, 10, 10, 0.92)",
                    fontSize: "15px",
                    lineHeight: "20px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "rgba(15, 15, 15, 0.55)",
                    fontSize: "13px",
                    lineHeight: "18px",
                  }}
                >
                  {s.prompt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    {
      ...SIZE,
      fonts: [
        { name: "Inter", data: interRegular, style: "normal", weight: 400 },
        { name: "Inter", data: interMedium, style: "normal", weight: 500 },
        { name: "Inter", data: interSemibold, style: "normal", weight: 600 },
      ],
    }
  );
}

export const Route = createFileRoute("/marketing/chat")({
  server: { handlers: { GET: ({ request }) => GET(request) } },
});
