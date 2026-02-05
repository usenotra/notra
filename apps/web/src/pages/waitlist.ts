import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { APIRoute } from "astro";
import { Resend } from "resend";
import * as z from "zod/mini";

const redis = new Redis({
  url: import.meta.env.UPSTASH_REDIS_REST_URL,
  token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "12 h"),
  prefix: "waitlist",
});

const resend = new Resend(import.meta.env.RESEND_API_KEY);

const schema = z.object({
  email: z.string().check(z.email()),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const { success } = await ratelimit.limit(clientAddress);

  if (!success) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const result = z.safeParse(schema, body);

  if (!result.success) {
    return new Response(JSON.stringify({ error: "Invalid email address" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { email } = result.data;

  const { error } = await resend.contacts.create({
    audienceId: import.meta.env.RESEND_AUDIENCE_ID,
    email,
    unsubscribed: false,
  });

  if (error) {
    return new Response(JSON.stringify({ error: "Failed to join waitlist" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ message: "Successfully joined waitlist" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
