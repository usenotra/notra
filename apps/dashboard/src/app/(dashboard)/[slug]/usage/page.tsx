"use client";

import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import { Progress } from "@notra/ui/components/ui/progress";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useCustomer } from "autumn-js/react";
import Link from "next/link";
import { use } from "react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function UsagePage({ params }: PageProps) {
  const { slug } = use(params);
  const { customer, isLoading } = useCustomer();

  const activeProduct = customer?.products.find(
    (p) => p.status === "active" || p.status === "trialing"
  );
  const isPro = activeProduct?.id === "pro";
  const isTrialing = activeProduct?.status === "trialing";

  const features = customer?.features ?? {};
  const featureEntries = Object.entries(features);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-8 flex items-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={CreditCardIcon} className="size-8" />
          <div>
            <h1 className="text-2xl font-bold">Usage</h1>
            <p className="text-muted-foreground text-sm">
              Track your feature usage and limits
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPro ? (
            <Badge
              variant={isTrialing ? "outline" : "secondary"}
              className="px-2 py-1"
            >
              {isTrialing ? "Pro Trial" : "Pro"}
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/15 px-2 py-1 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
              Free
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {isPro
                ? isTrialing
                  ? "You're on a Pro trial"
                  : "You're on the Pro plan"
                : "You're on the Free plan"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {activeProduct?.name ?? "Free"}
                  </p>
                  {activeProduct && (
                    <Badge variant="outline" className="text-xs">
                      v{activeProduct.version}
                    </Badge>
                  )}
                </div>
                {activeProduct && (
                  <p className="text-muted-foreground text-sm">
                    {isTrialing && activeProduct.trial_ends_at
                      ? `Trial ends ${new Date(activeProduct.trial_ends_at).toLocaleDateString()}`
                      : activeProduct.current_period_end
                        ? `Renews ${new Date(activeProduct.current_period_end).toLocaleDateString()}`
                        : null}
                  </p>
                )}
              </div>
              {!isPro && (
                <Link href={`/${slug}/test-checkout`}>
                  <Button>Upgrade to Pro</Button>
                </Link>
              )}
            </div>

            {activeProduct && activeProduct.items.length > 0 && (
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium">Plan includes:</p>
                <ul className="space-y-2">
                  {activeProduct.items.map((item, index) => {
                    const displayText =
                      item.display?.primary_text ??
                      (item.feature?.name
                        ? `${item.included_usage ?? "∞"} ${item.feature.name}${item.interval ? ` / ${item.interval}` : ""}`
                        : item.price
                          ? `$${item.price}/${item.interval ?? "month"}`
                          : null);

                    if (!displayText) return null;

                    return (
                      <li
                        key={`${item.feature_id ?? item.entity_feature_id ?? index}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-emerald-500">✓</span>
                        <span>{displayText}</span>
                        {item.display?.secondary_text && (
                          <span className="text-muted-foreground">
                            {item.display.secondary_text}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>
              Your current usage this billing cycle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {featureEntries.length > 0 ? (
              featureEntries.map(([featureId, feature]) => {
                const balance = feature.balance ?? 0;
                const usage = feature.usage ?? 0;
                const limit = feature.included_usage ?? feature.usage_limit ?? 0;
                const unlimited = feature.unlimited;
                const used = limit - balance;
                const percentage = unlimited || limit === 0 ? 0 : Math.min((used / limit) * 100, 100);
                const nextReset = feature.next_reset_at
                  ? new Date(feature.next_reset_at).toLocaleDateString()
                  : null;

                return (
                  <div key={featureId} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {feature.name || featureId.replace(/_/g, " ")}
                        </p>
                        {nextReset && (
                          <p className="text-muted-foreground text-xs">
                            Resets {nextReset}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {unlimited ? (
                          <Badge variant="secondary">Unlimited</Badge>
                        ) : (
                          <div>
                            <p className="text-lg font-semibold">
                              {balance}
                              <span className="text-muted-foreground text-sm font-normal">
                                {" "}/ {limit}
                              </span>
                            </p>
                            <p className="text-muted-foreground text-xs">
                              remaining
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {!unlimited && limit > 0 && (
                      <Progress
                        value={percentage}
                        className={percentage >= 100 ? "[&>div]:bg-destructive" : ""}
                      />
                    )}
                    {!unlimited && balance === 0 && (
                      <p className="text-destructive text-sm">
                        You've used all your {feature.name?.toLowerCase() || featureId.replace(/_/g, " ")} this month.
                        {!isPro && " Upgrade to Pro for more."}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-sm">
                No usage tracked yet. Start using chat to see your usage here.
              </p>
            )}
          </CardContent>
        </Card>

        {isPro && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Subscription</CardTitle>
              <CardDescription>
                View invoices and manage your billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/${slug}/test-checkout`}>
                <Button variant="outline">Manage Billing</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
