import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  FrameworkImageProps,
  FrameworkLinkProps,
} from "@notra/ui/types/framework";
import { FrameworkProvider, Image, Link } from "./framework-provider";

test("native links preserve anchor props without forwarding navigation options", () => {
  const html = renderToStaticMarkup(
    <Link
      aria-label="Home"
      href="/home"
      prefetch
      replace
      scroll={false}
      target="_blank"
    >
      Home
    </Link>,
  );
  assert.match(html, /href="\/home"/);
  assert.match(html, /aria-label="Home"/);
  assert.match(html, /target="_blank"/);
  assert.doesNotMatch(html, /prefetch|replace|scroll/);
});

test("native images resolve static imports and preserve aspect ratio", () => {
  const html = renderToStaticMarkup(
    <Image
      alt="Logo"
      height={30}
      src={{ default: { src: "/logo.png", width: 120, height: 60 } }}
    />,
  );
  assert.match(html, /src="\/logo.png"/);
  assert.match(html, /width="60"/);
  assert.match(html, /height="30"/);
});

test("native fill images strip optimization props and honor priority and styles", () => {
  const html = renderToStaticMarkup(
    <Image
      alt="Cover"
      blurDataURL="data:image/png;base64,abc"
      fill
      height={100}
      loader={() => "/optimized.png"}
      overrideSrc="/override.png"
      placeholder="blur"
      preload
      priority
      quality={80}
      src="/cover.png"
      style={{ objectFit: "cover" }}
      unoptimized
      width={200}
    />,
  );
  assert.match(html, /src="\/override.png"/);
  assert.match(
    html,
    /position:absolute;width:100%;height:100%;inset:0;object-fit:cover/,
  );
  assert.match(html, /loading="eager"/);
  assert.match(html, /fetchPriority="high"/);
  assert.doesNotMatch(
    html,
    /\s(?:fill|height|width|loader|overrideSrc|placeholder|preload|priority|quality|unoptimized|blurDataURL)=/,
  );
});

function CustomLink({ href, children, prefetch }: FrameworkLinkProps) {
  return (
    <a data-prefetch={String(prefetch)} href={`/custom${href}`}>
      {children}
    </a>
  );
}

function CustomImage({ src, alt, fill }: FrameworkImageProps) {
  return <img alt={alt} data-fill={String(fill)} src={String(src)} />;
}

test("providers select adapters, pass framework props, and inherit omitted adapters", () => {
  const html = renderToStaticMarkup(
    <FrameworkProvider Link={CustomLink}>
      <FrameworkProvider Image={CustomImage}>
        <Link href="/home" prefetch={false}>
          Home
        </Link>
        <Image alt="Cover" fill src="/cover.png" />
      </FrameworkProvider>
    </FrameworkProvider>,
  );
  assert.match(html, /href="\/custom\/home"/);
  assert.match(html, /data-prefetch="false"/);
  assert.match(html, /data-fill="true"/);
  assert.match(html, /src="\/cover.png"/);
});
