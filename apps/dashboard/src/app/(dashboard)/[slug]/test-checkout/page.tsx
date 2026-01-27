"use client";

import { useState } from "react";
import { useCustomer, usePricingTable } from "autumn-js/react";
import { Button } from "@notra/ui/components/ui/button";
import type { CheckoutResult, Product } from "autumn-js";

const SCENARIO_TEXT: Record<string, string> = {
  scheduled: "Plan Scheduled",
  active: "Current Plan",
  renew: "Renew",
  upgrade: "Upgrade",
  new: "Enable",
  downgrade: "Downgrade",
  cancel: "Cancel Plan",
};

function getPricingButtonText(product: Product): string {
  const { scenario, properties, free_trial } = product;
  const { is_one_off, updateable } = properties ?? {};

  if (free_trial?.trial_available) return "Start Trial";
  if (scenario === "active" && updateable) return "Update";
  if (scenario === "new" && is_one_off) return "Purchase";

  return SCENARIO_TEXT[scenario ?? ""] ?? "Enable Plan";
}

function getProductPrice(product: Product): string {
  const priceItem = product.items.find((item) => item.price !== undefined);
  if (!priceItem?.price) return "Free";

  const interval = priceItem.interval ?? "month";
  return `$${priceItem.price}/${interval}`;
}

function getConfirmationTexts(result: CheckoutResult): { title: string; message: string } {
  const { product, current_product, next_cycle } = result;
  const scenario = product.scenario;
  const productName = product.name;
  const currentProductName = current_product?.name;
  const nextCycleDate = next_cycle?.starts_at
    ? new Date(next_cycle.starts_at).toLocaleDateString()
    : undefined;

  const isRecurring = !product.properties?.is_one_off;

  const CONFIRMATION_TEXT: Record<string, { title: string; message: string }> = {
    scheduled: { title: "Already Scheduled", message: "You already have this product scheduled." },
    active: { title: "Already Active", message: "You are already subscribed to this product." },
    renew: { title: "Renew", message: `Renew your subscription to ${productName}.` },
    upgrade: { title: `Upgrade to ${productName}`, message: `Upgrade to ${productName}. Your card will be charged immediately.` },
    downgrade: { title: `Downgrade to ${productName}`, message: `${currentProductName} will be cancelled. ${productName} begins ${nextCycleDate}.` },
    cancel: { title: "Cancel", message: `Your subscription to ${currentProductName} will end ${nextCycleDate}.` },
  };

  if (scenario === "new") {
    return isRecurring
      ? { title: `Subscribe to ${productName}`, message: `Subscribe to ${productName}. Charged immediately.` }
      : { title: `Purchase ${productName}`, message: `Purchase ${productName}. Charged immediately.` };
  }

  return CONFIRMATION_TEXT[scenario ?? ""] ?? { title: "Change Subscription", message: "You are about to change your subscription." };
}

export default function TestCheckoutPage() {
  const { products, isLoading: productsLoading } = usePricingTable();
  const { checkout, attach, customer, isLoading: customerLoading } = useCustomer();
  const [pendingCheckout, setPendingCheckout] = useState<CheckoutResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(productId: string) {
    setLoading(productId);
    try {
      const { data, error } = await checkout({ productId });

      if (error) {
        console.error("Checkout error:", error);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else if (data) {
        setPendingCheckout(data);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirm() {
    if (!pendingCheckout) return;

    setLoading("confirm");
    try {
      await attach({ productId: pendingCheckout.product.id });
      setPendingCheckout(null);
      window.location.reload();
    } catch (err) {
      console.error("Attach error:", err);
    } finally {
      setLoading(null);
    }
  }

  if (productsLoading || customerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const confirmTexts = pendingCheckout ? getConfirmationTexts(pendingCheckout) : null;

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <h1 className="mb-2 text-3xl font-bold">Test Checkout</h1>
      <p className="text-muted-foreground mb-8">
        Customer ID: {customer?.id ?? "Not loaded"}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {products?.map((product) => (
          <div key={product.id} className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              {product.scenario ?? "unknown"} • {product.id}
            </p>

            <p className="mb-4 text-2xl font-bold">{getProductPrice(product)}</p>

            {product.free_trial?.trial_available && (
              <p className="text-muted-foreground mb-2 text-sm">
                {product.free_trial.length}-day free trial
              </p>
            )}

            <Button
              onClick={() => handleCheckout(product.id)}
              disabled={loading !== null || product.scenario === "active"}
              variant={product.scenario === "active" ? "outline" : "default"}
              className="w-full"
            >
              {loading === product.id ? "Loading..." : getPricingButtonText(product)}
            </Button>
          </div>
        ))}
      </div>

      {pendingCheckout && confirmTexts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-900">
            <h2 className="mb-2 text-xl font-semibold">{confirmTexts.title}</h2>
            <p className="text-muted-foreground mb-4">{confirmTexts.message}</p>

            {pendingCheckout.total !== undefined && (
              <p className="mb-4 text-lg font-medium">
                Total: {pendingCheckout.currency?.toUpperCase()} {pendingCheckout.total}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPendingCheckout(null)}
                disabled={loading === "confirm"}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading === "confirm"}
                className="flex-1"
              >
                {loading === "confirm" ? "Processing..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
