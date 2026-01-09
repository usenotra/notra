"use client";

import { ArrowRight, Github, Terminal } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const COMMIT_MESSAGES = [
  "feat: add user authentication flow",
  "fix: resolve memory leak in dashboard",
  "refactor: optimize database queries",
  "feat: implement real-time notifications",
  "chore: update dependencies to latest",
];

const GENERATED_CONTENT = [
  "New authentication system makes signing in seamless",
  "Performance improvements for a smoother experience",
  "Under-the-hood optimizations for faster load times",
  "Stay updated with instant notifications",
  "Security updates and stability improvements",
];

function CommitToContent() {
  const [commitIndex, setCommitIndex] = useState(0);
  const [phase, setPhase] = useState<"commit" | "processing" | "content">(
    "commit"
  );

  useEffect(() => {
    if (phase === "commit") {
      const timeout = setTimeout(() => setPhase("processing"), 2500);
      return () => clearTimeout(timeout);
    }
    if (phase === "processing") {
      const timeout = setTimeout(() => setPhase("content"), 1500);
      return () => clearTimeout(timeout);
    }
    if (phase === "content") {
      const timeout = setTimeout(() => {
        setCommitIndex((prev) => (prev + 1) % COMMIT_MESSAGES.length);
        setPhase("commit");
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  return (
    <div className="relative">
      {/* Terminal window */}
      <div className="landing-card overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 border-white/10 border-b px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="ml-4 font-mono text-sm text-white/40">
            notra --watch
          </span>
        </div>

        {/* Terminal content */}
        <div className="p-6 font-mono text-sm">
          {/* Git commit line */}
          <div className="flex items-start gap-3">
            <span className="text-green-400">$</span>
            <div className="flex-1">
              <span className="text-white/60">git commit -m </span>
              <span className="text-amber-400">
                &quot;{COMMIT_MESSAGES[commitIndex]}&quot;
              </span>
            </div>
          </div>

          {/* Processing animation */}
          <div
            className={cn(
              "mt-6 transition-all duration-500",
              phase === "commit" ? "opacity-0" : "opacity-100"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  phase === "processing"
                    ? "animate-pulse bg-amber-400"
                    : "bg-green-400"
                )}
              />
              <span className="text-white/60">
                {phase === "processing"
                  ? "Analyzing commit..."
                  : "Content generated"}
              </span>
            </div>
          </div>

          {/* Generated content */}
          <div
            className={cn(
              "mt-6 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 transition-all duration-500",
              phase === "content"
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            )}
          >
            <div className="mb-2 text-amber-400/60 text-xs uppercase tracking-wider">
              Generated changelog entry
            </div>
            <p className="text-base text-white/90">
              {GENERATED_CONTENT[commitIndex]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 right-0 left-0 z-50 transition-all duration-300",
        scrolled ? "bg-[#0a0a0b]/90 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link className="flex items-center gap-3" href="/landing">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
            <Terminal className="h-5 w-5 text-[#0a0a0b]" />
          </div>
          <span className="font-semibold text-white text-xl tracking-tight">
            Notra
          </span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          <Link
            className="text-sm text-white/60 transition-colors hover:text-white"
            href="#features"
          >
            Features
          </Link>
          <Link
            className="text-sm text-white/60 transition-colors hover:text-white"
            href="#how-it-works"
          >
            How it works
          </Link>
          <Link
            className="text-sm text-white/60 transition-colors hover:text-white"
            href="#pricing"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            className="text-sm text-white/60 transition-colors hover:text-white"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="landing-button-primary flex items-center gap-2"
            href="/signup"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden px-6 pt-32">
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(white 1px, transparent 1px),
                           linear-gradient(90deg, white 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Gradient accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse, rgba(251, 191, 36, 0.3) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left column - Text */}
          <div className="flex flex-col justify-center">
            {/* Badge */}
            <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              Now in public beta
            </div>

            {/* Main headline */}
            <h1 className="mb-6 font-bold text-5xl text-white leading-[1.1] tracking-tight md:text-7xl">
              Your commits,
              <br />
              <span className="text-amber-400">your content.</span>
            </h1>

            {/* Subheadline */}
            <p className="mb-10 max-w-lg text-lg text-white/60 leading-relaxed md:text-xl">
              Notra watches your GitHub activity and transforms every push into
              changelogs, blog posts, and social updates. Automatically.
            </p>

            {/* CTAs */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                className="landing-button-primary flex items-center justify-center gap-2"
                href="/signup"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="landing-button-secondary flex items-center justify-center gap-2"
                href="#how-it-works"
              >
                See how it works
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 border-white/10 border-t pt-8">
              <div>
                <div className="font-bold text-3xl text-white">10k+</div>
                <div className="mt-1 text-sm text-white/40">
                  Commits processed
                </div>
              </div>
              <div>
                <div className="font-bold text-3xl text-white">500+</div>
                <div className="mt-1 text-sm text-white/40">Teams using</div>
              </div>
              <div>
                <div className="font-bold text-3xl text-white">99%</div>
                <div className="mt-1 text-sm text-white/40">Time saved</div>
              </div>
            </div>
          </div>

          {/* Right column - Visual */}
          <div className="flex items-center justify-center lg:justify-end">
            <CommitToContent />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      number: "01",
      title: "GitHub Native",
      description:
        "Connect once, forget forever. Notra monitors your repositories and captures every meaningful change without any manual intervention.",
    },
    {
      number: "02",
      title: "AI That Gets You",
      description:
        "Our models learn your voice, your style, your preferences. Generated content sounds like you wrote it, because it's trained on you.",
    },
    {
      number: "03",
      title: "Multi-Format Output",
      description:
        "One commit, infinite possibilities. Generate changelogs, blog posts, tweets, release notes, and investor updates simultaneously.",
    },
    {
      number: "04",
      title: "Brand Consistency",
      description:
        "Define your guidelines once. Every piece of content maintains your tone, terminology, and style automatically.",
    },
  ];

  return (
    <section className="relative px-6 py-32" id="features">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-20 max-w-2xl">
          <div className="mb-4 font-mono text-amber-400 text-sm uppercase tracking-wider">
            Features
          </div>
          <h2 className="mb-6 font-bold text-4xl text-white leading-tight tracking-tight md:text-5xl">
            Built for teams who ship fast
          </h2>
          <p className="text-lg text-white/60 leading-relaxed">
            Stop context-switching between coding and content creation. Notra
            handles the storytelling while you focus on building.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature) => (
            <div
              className="group relative border-white/10 border-t pt-8 transition-all hover:border-amber-400/30"
              key={feature.number}
            >
              <div className="mb-4 font-mono text-amber-400/60 text-sm">
                {feature.number}
              </div>
              <h3 className="mb-3 font-semibold text-2xl text-white">
                {feature.title}
              </h3>
              <p className="text-white/50 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      title: "Connect",
      description: "Link your GitHub repositories with a single OAuth flow.",
    },
    {
      title: "Configure",
      description: "Set your brand voice, preferred formats, and output style.",
    },
    {
      title: "Commit",
      description: "Push code as usual. Notra detects and queues your changes.",
    },
    {
      title: "Create",
      description:
        "Review AI-generated content, edit if needed, publish anywhere.",
    },
  ];

  return (
    <section className="relative overflow-hidden px-6 py-32" id="how-it-works">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-400/[0.02] to-transparent" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left - Content */}
          <div>
            <div className="mb-4 font-mono text-amber-400 text-sm uppercase tracking-wider">
              How it works
            </div>
            <h2 className="mb-12 font-bold text-4xl text-white leading-tight tracking-tight md:text-5xl">
              Four steps to
              <br />
              automated content
            </h2>

            <div className="space-y-8">
              {steps.map((step, index) => (
                <div className="group flex gap-6" key={step.title}>
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-white/10 font-mono text-white/40 transition-all group-hover:border-amber-400/30 group-hover:text-amber-400">
                    {index + 1}
                  </div>
                  <div className="pt-2">
                    <h3 className="mb-2 font-semibold text-lg text-white">
                      {step.title}
                    </h3>
                    <p className="text-white/50">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Code example */}
          <div className="flex items-center">
            <div className="landing-card w-full overflow-hidden">
              <div className="flex items-center gap-2 border-white/10 border-b px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-4 font-mono text-sm text-white/40">
                  notra.config.ts
                </span>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-sm">
                <code>
                  <span className="text-purple-400">export default</span>
                  {" {\n"}
                  {"  "}
                  <span className="text-white/60">repositories</span>
                  {": [\n"}
                  {"    "}
                  <span className="text-amber-400">
                    &quot;github.com/you/app&quot;
                  </span>
                  {",\n"}
                  {"  ],\n"}
                  {"  "}
                  <span className="text-white/60">outputs</span>
                  {": [\n"}
                  {"    "}
                  <span className="text-amber-400">&quot;changelog&quot;</span>
                  {",\n"}
                  {"    "}
                  <span className="text-amber-400">&quot;blog&quot;</span>
                  {",\n"}
                  {"    "}
                  <span className="text-amber-400">&quot;twitter&quot;</span>
                  {",\n"}
                  {"  ],\n"}
                  {"  "}
                  <span className="text-white/60">voice</span>
                  {": "}
                  <span className="text-amber-400">
                    &quot;professional&quot;
                  </span>
                  {",\n"}
                  {"  "}
                  <span className="text-white/60">autoPublish</span>
                  {": "}
                  <span className="text-purple-400">true</span>
                  {",\n}"}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection() {
  const integrations = [
    { name: "GitHub", description: "Source control" },
    { name: "Linear", description: "Issue tracking" },
    { name: "Slack", description: "Notifications" },
    { name: "Notion", description: "Documentation" },
    { name: "Twitter", description: "Social" },
    { name: "Discord", description: "Community" },
  ];

  return (
    <section className="relative px-6 py-32" id="integrations">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 text-center font-mono text-amber-400 text-sm uppercase tracking-wider">
          Integrations
        </div>
        <h2 className="mb-6 text-center font-bold text-4xl text-white tracking-tight md:text-5xl">
          Plays well with others
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-white/60">
          Notra integrates with your existing workflow. Import from anywhere,
          export everywhere.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {integrations.map((integration) => (
            <div
              className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center transition-all hover:border-amber-400/30 hover:bg-white/[0.04]"
              key={integration.name}
            >
              <div className="mb-2 font-medium text-white">
                {integration.name}
              </div>
              <div className="text-sm text-white/40">
                {integration.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="relative px-6 py-32" id="pricing">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-6 font-bold text-4xl text-white tracking-tight md:text-6xl">
          Ready to automate
          <br />
          your content?
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-white/60">
          Start free. No credit card required. Generate your first changelog in
          under 2 minutes.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            className="landing-button-primary flex items-center gap-2 px-8 py-4 text-lg"
            href="/signup"
          >
            Get started for free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <p className="mt-8 text-sm text-white/40">
          Free for open source. Pro plans start at $19/month.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-white/10 border-t px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <Terminal className="h-5 w-5 text-[#0a0a0b]" />
            </div>
            <span className="font-semibold text-white text-xl">Notra</span>
          </div>

          <div className="flex items-center gap-8 text-sm text-white/40">
            <Link
              className="flex items-center gap-2 transition-colors hover:text-white"
              href="https://github.com/mezotv/notra"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
          </div>

          <p className="text-sm text-white/40">
            &copy; {year ?? ""} Notra. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <IntegrationsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
