"use client";

import { GEO_BRAND_FACT_CATEGORIES } from "@notra/db/types/geo-accuracy";
import { ACCURACY_CATEGORY_LABELS } from "@notra/geo-core/constants/accuracy-analysis";
import { KNOWLEDGE_MAX_RECORDS } from "@notra/geo-core/constants/brand-knowledge";
import type { BrandKnowledgeRecord } from "@notra/geo-core/types/brand-knowledge";
import { Input } from "@notra/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { useBrandKnowledge } from "@/lib/hooks/use-brand-knowledge";
import type { KnowledgePanelProps } from "@/types/brand-knowledge";

const NONE_GITHUB = "none";
const ORIGIN_LABELS = {
  github: "GitHub",
  website: "Website",
  manual: "Manual",
} as const;

type CategoryFilter = "all" | BrandKnowledgeRecord["category"];

function emptyRecord(): BrandKnowledgeRecord {
  return {
    id: crypto.randomUUID(),
    statement: "",
    category: "company",
    origin: "manual",
    pinned: true,
  };
}

function sourceHref(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function sourceLabel(record: BrandKnowledgeRecord): string {
  if (record.sourcePath) {
    return record.sourcePath;
  }
  const href = sourceHref(record.sourceUrl);
  if (!href) {
    return "";
  }
  try {
    const path = new URL(href).pathname;
    return path === "/" ? new URL(href).hostname.replace(/^www\./, "") : path;
  } catch {
    return "";
  }
}

export function KnowledgePanel({
  organizationId,
  voiceId,
  voiceWebsiteUrl,
}: KnowledgePanelProps) {
  const knowledge = useBrandKnowledge(organizationId, voiceId);
  const state = knowledge.query.data;
  const [drafts, setDrafts] = useState<BrandKnowledgeRecord[]>([]);
  const [githubId, setGithubId] = useState<string>("");
  const [filter, setFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    if (!state) {
      return;
    }
    setDrafts(state.records);
    setGithubId(state.githubIntegrationId ?? "");
  }, [state]);

  const websiteUrl = voiceWebsiteUrl || state?.websiteUrl || "";
  const canScan = Boolean(githubId || websiteUrl);
  const mix = useMemo(() => {
    const counts = {
      pricing: 0,
      features: 0,
      policy: 0,
      company: 0,
      other: 0,
    };
    for (const record of drafts) {
      counts[record.category] += 1;
    }
    return counts;
  }, [drafts]);
  const visible = drafts.filter(
    (record) => filter === "all" || record.category === filter
  );
  const githubItems: Record<string, string> = {
    [NONE_GITHUB]: "No GitHub repo",
    ...Object.fromEntries(
      (state?.githubRepos ?? []).map((repo) => [
        repo.id,
        `${repo.owner}/${repo.repo}`,
      ])
    ),
  };
  if (githubId && !(githubId in githubItems)) {
    githubItems[githubId] = "Linked repo";
  }

  function updateRecord(
    id: string,
    patch: Partial<BrandKnowledgeRecord>,
    pin = true
  ) {
    setDrafts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              ...(pin ? { pinned: true } : {}),
            }
          : item
      )
    );
  }

  async function handleScan() {
    try {
      await knowledge.scan({
        organizationId,
        voiceId,
        githubIntegrationId: githubId || null,
      });
      toast.success("Knowledge updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed");
    }
  }

  async function handleSave() {
    try {
      await knowledge.save({
        organizationId,
        voiceId,
        githubIntegrationId: githubId || null,
        records: drafts.filter((record) => record.statement.trim()),
      });
      toast.success("Knowledge saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm text-pretty">
          Scan GitHub and this website into checkable facts. Accuracy uses this
          list as the source of truth.
        </p>
        <p className="text-sm">
          Website:{" "}
          <span className="text-muted-foreground">
            {websiteUrl || "Add a URL in Company Info"}
          </span>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            items={githubItems}
            onValueChange={(value) =>
              setGithubId(!value || value === NONE_GITHUB ? "" : value)
            }
            value={githubId || NONE_GITHUB}
          >
            <SelectTrigger
              aria-label="GitHub repository"
              className="w-full sm:w-72"
            >
              <SelectValue placeholder="No GitHub repo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_GITHUB}>No GitHub repo</SelectItem>
              {(state?.githubRepos ?? []).map((repo) => (
                <SelectItem key={repo.id} value={repo.id}>
                  {repo.owner}/{repo.repo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={knowledge.isScanning || !canScan}
            onClick={handleScan}
            type="button"
          >
            {knowledge.isScanning ? "Scanning…" : "Scan"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs tabular-nums">
          {drafts.length}/{KNOWLEDGE_MAX_RECORDS} facts
          {state?.syncedAt
            ? ` · Last scan ${new Date(state.syncedAt).toLocaleString()}`
            : ""}
        </p>
        {state?.syncError ? (
          <p className="text-destructive text-xs" role="status">
            {state.syncError}
          </p>
        ) : null}
      </div>
      {knowledge.query.isPending && !state ? (
        <p className="text-muted-foreground text-sm">Loading knowledge…</p>
      ) : null}
      {drafts.length ? (
        <div className="flex flex-wrap gap-1">
          {(["all", ...GEO_BRAND_FACT_CATEGORIES] as const).map((key) => {
            const count = key === "all" ? drafts.length : mix[key];
            if (key !== "all" && count === 0) {
              return null;
            }
            return (
              <Button
                aria-pressed={filter === key}
                key={key}
                onClick={() => setFilter(key)}
                size="sm"
                type="button"
                variant={filter === key ? "secondary" : "ghost"}
              >
                {key === "all" ? "All" : ACCURACY_CATEGORY_LABELS[key]} {count}
              </Button>
            );
          })}
        </div>
      ) : null}
      {drafts.length === 0 && !knowledge.query.isPending ? (
        <EmptyState
          actionLabel={canScan ? "Scan" : "Add fact"}
          description={
            canScan
              ? "Pull pricing, product, and policy facts from the website. Pinned and manual rows survive the next scan."
              : "Add a website URL in Company Info, or add a fact by hand."
          }
          onActionClick={() => {
            if (canScan) {
              void handleScan();
              return;
            }
            setDrafts([emptyRecord()]);
          }}
          title="No Knowledge facts yet"
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((record, index) => {
            const href = sourceHref(record.sourceUrl);
            const label = sourceLabel(record);
            return (
              <li className="space-y-2" key={record.id}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    aria-label={`Knowledge fact ${index + 1}`}
                    onChange={(event) =>
                      updateRecord(record.id, { statement: event.target.value })
                    }
                    placeholder="Starting price is $49 per month"
                    value={record.statement}
                  />
                  <Select
                    items={ACCURACY_CATEGORY_LABELS}
                    onValueChange={(value) => {
                      if (!value) {
                        return;
                      }
                      updateRecord(record.id, {
                        category: value as BrandKnowledgeRecord["category"],
                      });
                    }}
                    value={record.category}
                  >
                    <SelectTrigger
                      aria-label={`Category for fact ${index + 1}`}
                      className="w-full sm:w-36"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GEO_BRAND_FACT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {ACCURACY_CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() =>
                      setDrafts((current) =>
                        current.filter((item) => item.id !== record.id)
                      )
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span>{ORIGIN_LABELS[record.origin]}</span>
                  {href ? (
                    <a
                      className="text-foreground underline-offset-2 hover:underline"
                      href={href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {label || "Source"}
                    </a>
                  ) : null}
                  {record.pinned || record.origin === "manual" ? (
                    <span>Pinned</span>
                  ) : null}
                  {record.origin === "manual" ? null : (
                    <Button
                      onClick={() =>
                        updateRecord(
                          record.id,
                          { pinned: record.pinned ? undefined : true },
                          false
                        )
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {record.pinned ? "Unpin" : "Pin"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={drafts.length >= KNOWLEDGE_MAX_RECORDS}
          onClick={() => {
            setFilter("all");
            setDrafts((current) => [...current, emptyRecord()]);
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Add fact
        </Button>
        <Button
          disabled={knowledge.isSaving || drafts.length === 0}
          onClick={handleSave}
          size="sm"
          type="button"
        >
          {knowledge.isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
