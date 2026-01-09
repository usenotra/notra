"use client";

import { ArrowRight, Bot, FileText, Github, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        scrolled
          ? "border-border/50 border-b bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link className="flex items-center gap-2" href="/landing">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-lg">Notra</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            href="/login"
          >
            Sign in
          </Link>
          <Link className={cn(buttonVariants({ size: "sm" }))} href="/signup">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative px-6 pt-32 pb-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary text-sm">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered content engine
        </div>

        <h1 className="mb-6 font-bold text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl">
          Turn your work
          <br />
          <span className="text-primary">into content</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
          Notra connects to the tools you already use and automatically
          transforms your activity into blog posts, changelogs, tweets, and
          more. Zero effort required.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            href="/signup"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            href="#how-it-works"
          >
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}

function IntegrationsBar() {
  return (
    <section className="border-border/50 border-y bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-center text-muted-foreground text-sm">
          Connects with your favorite tools
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <span className="font-medium">GitHub</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 3h18v18H3V3zm16.5 16.5v-15h-15v15h15zM6.75 8.25h3v7.5h-3v-7.5zm5.25 0h3v7.5h-3v-7.5z" />
            </svg>
            <span className="font-medium">Linear</span>
          </div>
          <div className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
            <span className="font-medium">Slack</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Connect your tools",
      description:
        "Link GitHub, Linear, Slack, and other tools with a few clicks. Notra starts collecting data automatically.",
    },
    {
      number: "2",
      title: "We watch your activity",
      description:
        "Every commit, issue, and conversation becomes raw material. No manual input needed from you.",
    },
    {
      number: "3",
      title: "Content appears like magic",
      description:
        "Our AI transforms your work into polished blog posts, changelogs, tweets, and LinkedIn posts.",
    },
  ];

  return (
    <section className="px-6 py-20" id="how-it-works">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-bold text-3xl text-foreground tracking-tight">
            How it works
          </h2>
          <p className="text-muted-foreground">
            From your daily work to published content in three simple steps.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div className="text-center" key={step.number}>
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                {step.number}
              </div>
              <h3 className="mb-2 font-semibold text-foreground text-lg">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: "Automatic Data Collection",
      description:
        "Notra connects via webhooks and APIs to pull in commits, issues, discussions, and more. You don't lift a finger.",
    },
    {
      icon: Bot,
      title: "Intelligent Content Generation",
      description:
        "Our AI agent understands context, learns your voice, and creates content that sounds like you wrote it.",
    },
    {
      icon: FileText,
      title: "Multiple Output Formats",
      description:
        "Get blog posts, changelogs, social media updates, and investor reports—all from the same source data.",
    },
  ];

  return (
    <section className="bg-muted/30 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="mb-3 font-bold text-3xl text-foreground tracking-tight">
            Fully autonomous
          </h2>
          <p className="text-muted-foreground">
            Set it up once, then forget about it. Notra runs in the background.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                className="rounded-xl border border-border bg-card p-6"
                key={feature.title}
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-4 font-bold text-3xl text-foreground tracking-tight">
          Ready to automate your content?
        </h2>
        <p className="mb-8 text-muted-foreground">
          Join teams who ship content as fast as they ship code.
          <br />
          Free to start. No credit card required.
        </p>
        <Link
          className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          href="/signup"
        >
          Get started free
          <ArrowRight className="h-4 w-4" />
        </Link>
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
    <footer className="border-border/50 border-t px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
            <Sparkles className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="font-medium text-foreground">Notra</span>
        </div>
        <p className="text-muted-foreground text-sm">
          &copy; {year ?? ""} Notra. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <IntegrationsBar />
        <HowItWorksSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
