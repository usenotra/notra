Meta Muse launched on September 8, 2026 and hit number one on the Apple US App Store within ten days. Ten days after that, Zuckerberg opened connector submissions to developers. The window is still open, and building one is worth doing even if Muse wasn't already on your radar, which btw it probably should be 😄

## What is a Muse connector?

[Muse](https://muse.ai) is Meta's personal AI agent. It runs on Meta's cloud computer, not yours, and it can browse the web, manage your calendar, book things, write emails, and work across apps. A connector is how your product shows up in that environment. It gives Muse a new ability, like reading from your service or taking actions in it, so a user can just ask for it in chat.

Under the hood, a connector is an MCP server. Muse writes its own MCP client when a user connects a service, stores their credentials in a secure store, and calls your tools from there.

There are two flavors: directory connectors that Meta reviews and lists for any user to tap, and custom connectors that Muse builds on-demand for a single user from any API without Meta reviewing them. You want the first kind. The second kind already exists whether you build anything or not. Your users can wire Muse up to your API right now without you doing a thing. A directory listing makes it official and discoverable 🎉

## What you actually need to build

A Muse connector is an MCP server, so the list is short:

- A hosted MCP server reachable over HTTPS (Muse runs in the cloud, so localhost won't work)
- Streamable HTTP transport, which is what Muse uses to talk to remote servers
- API key auth, because Muse stores credentials in its Secure Credentials Store and sends them as a header on every request
- Named tools with clear descriptions so Muse knows when to call them

If you already have an MCP server running, you're most of the way there. If you only have a REST API, you'll need a thin MCP layer on top. The [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) is the fastest way to get there.

## A real example: Blotato

Before writing a single line, look at [Blotato](https://blotato.com/meta-muse). They ship a social scheduling tool and they already have a working Muse connector. Their MCP server runs at `https://mcp.blotato.com/mcp`, uses streamable HTTP, and authenticates with a `blotato-api-key` header. A user connects it by asking Muse to set it up, and Muse handles the rest.

That's the whole pattern. One public endpoint, one auth header, tools with useful descriptions. Everything else is your product logic.

## Build the server

A minimal MCP server in TypeScript looks like this:

```typescript

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const server = new McpServer({ name: "your-connector", version: "0.1.0" });

server.tool(
  "create_draft",
  "Save a new content draft. Use when the user asks to save or store a draft.",
  { title: { type: "string" }, content: { type: "string" } },
  async ({ title, content }) => {
    // call your API here
    return { content: [{ type: "text", text: `Draft saved: ${title}` }] };
  }
);

const transport = new StreamableHTTPServerTransport({ path: "/mcp" });
await server.connect(transport);

```

The tool description matters more than the name. Muse routes calls based on what the user said in chat, so "Save a new content draft. Use when the user asks to save or store a draft." is a lot more useful than leaving it blank.

For auth, read the API key from the request header before it hits the MCP transport:

```typescript

const apiKey = req.headers["your-api-key-header"];
if (!apiKey || !isValidKey(apiKey)) {
  res.status(401).json({ error: "Invalid API key" });
  return;
}

```

Use a clear header name and document it. Meta needs it during review, and users need to know what to paste when Muse prompts them.

One more thing on tool design: Muse asks users to approve write actions by default. Keep your read tools separate from your write tools and be explicit about which ones can't be undone. It makes the review go smoother and gives users more confidence connecting your product.

## Test before you submit

Point [Claude Desktop](https://claude.ai/download) at your server. It supports local MCP over HTTP and it's the fastest way to check your tools before Muse ever sees them. Run through the tasks a user would actually ask Muse to do, and test what happens when things go wrong: bad API key, missing fields, a downstream failure. Muse should explain what failed, not just go quiet.

## Submit and get listed

Once it's working, head to [muse.ai/platform](https://muse.ai/platform) and hit Submit a connector. The form asks you to describe your product and how users will use it. Meta reviews for functional, security, and legal requirements and runs end-to-end testing before listing.

No SDK, no published developer terms, no fee structure on the page yet. The platform is new and those details will fill in fast. Submit early, ask about terms, keep an eye on the page.

When you get approved, install it with a test account and run through your own README examples. Record a short demo of Muse completing a real task through your connector. That's your launch content, and it's the most honest kind 😊

## Why this is worth doing now

An agent that can call your tools is more likely to recommend your product than one that can't. That's the GEO angle, and it's a real one. The Muse directory is new, so first-mover placement is still available across most categories. Honestly the lift isn't that high if you already have an API 😉

## Find out what agents say about you. Then change it.

Add a few prompts, run a scan, read the answers. Free to start.

[Start for free](https://app.usenotra.com/signup?db_source=cta_banner) &nbsp;&nbsp; [Book a Call](https://www.usenotra.com/contact)