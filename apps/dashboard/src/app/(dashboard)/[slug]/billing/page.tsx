"use client";

import {
	ArrowDown01Icon,
	ArrowUp01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Counter from "@notra/ui/components/Counter";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@notra/ui/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { cn } from "@notra/ui/lib/utils";
import type { CheckoutResult, Product } from "autumn-js";
import { useCustomer, usePricingTable } from "autumn-js/react";
import { useId, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/container";
import { TitleCard } from "@/components/title-card";

const SCENARIO_TEXT: Record<string, string> = {
	scheduled: "Plan Scheduled",
	active: "Current Plan",
	renew: "Renew",
	upgrade: "Upgrade",
	new: "Get Started",
	downgrade: "Downgrade",
	cancel: "Cancel Plan",
};

const INVOICE_PRODUCT_NAME_MAP: Record<string, string> = {
	free: "Free",
	pro: "Pro Monthly",
	pro_yearly: "Pro Yearly",
};

function formatInvoiceProductName(productId: string): string {
	return INVOICE_PRODUCT_NAME_MAP[productId] ?? productId;
}

function getInvoiceDescription(productIds?: string[]): string {
	if (!productIds?.length) return "Subscription";

	return productIds.map(formatInvoiceProductName).join(", ");
}

function getPricingButtonText(product: Product): string {
	const { scenario, properties, free_trial } = product;
	const { is_one_off, updateable } = properties ?? {};

	if (free_trial?.trial_available) return "Start Free Trial";
	if (scenario === "active" && updateable) return "Update";
	if (scenario === "new" && is_one_off) return "Purchase";

	return SCENARIO_TEXT[scenario ?? ""] ?? "Get Started";
}

function getProductPrice(product: Product): {
	amount: number;
	interval: string;
} {
	const priceItem = product.items.find((item) => item.price !== undefined);
	if (!priceItem?.price) return { amount: 0, interval: "month" };

	return {
		amount: priceItem.price,
		interval: priceItem.interval ?? "month",
	};
}

function getConfirmationTexts(result: CheckoutResult): {
	title: string;
	message: string;
} {
	const { product, current_product, next_cycle } = result;
	const scenario = product.scenario;
	const productName = product.name;
	const currentProductName = current_product?.name;
	const nextCycleDate = next_cycle?.starts_at
		? new Date(next_cycle.starts_at).toLocaleDateString()
		: undefined;

	const isRecurring = !product.properties?.is_one_off;

	const CONFIRMATION_TEXT: Record<string, { title: string; message: string }> =
		{
			scheduled: {
				title: "Already Scheduled",
				message: "You already have this product scheduled.",
			},
			active: {
				title: "Already Active",
				message: "You are already subscribed to this product.",
			},
			renew: {
				title: "Renew",
				message: `Renew your subscription to ${productName}.`,
			},
			upgrade: {
				title: `Upgrade to ${productName}`,
				message: `Upgrade to ${productName}. Your card will be charged immediately.`,
			},
			downgrade: {
				title: `Downgrade to ${productName}`,
				message: `${currentProductName} will be cancelled. ${productName} begins ${nextCycleDate}.`,
			},
			cancel: {
				title: "Cancel",
				message: `Your ${currentProductName} subscription will end ${nextCycleDate}.`,
			},
		};

	if (scenario === "new") {
		return isRecurring
			? {
					title: `Subscribe to ${productName}`,
					message: `Subscribe to ${productName}. Charged immediately.`,
				}
			: {
					title: `Purchase ${productName}`,
					message: `Purchase ${productName}. Charged immediately.`,
				};
	}

	return (
		CONFIRMATION_TEXT[scenario ?? ""] ?? {
			title: "Change Subscription",
			message: "You are about to change your subscription.",
		}
	);
}

function getProductFeatures(product: Product | undefined): string[] {
	if (!product?.items) return [];

	return product.items
		.filter((item) => {
			const isFeatureItem =
				item.type === "feature" || item.type === "priced_feature";
			const hasFeatureData =
				item.feature_id || item.feature || item.display?.primary_text;
			const hasUsage = item.included_usage !== 0;
			// Remove later: filter out price items until Autumn SDK fix
			const isPriceItem =
				item.price !== undefined && !item.feature_id && !item.feature;
			return (isFeatureItem || hasFeatureData) && hasUsage && !isPriceItem;
		})
		.map((item) => {
			const displayText = item.display?.primary_text ?? "";
			// Remove later: skip price-like display text until Autumn SDK fix
			if (displayText.startsWith("$") || /^\d+([.,]\d+)?$/.test(displayText)) {
				return "";
			}
			if (displayText) {
				return displayText;
			}

			const featureName = item.feature?.name ?? "";
			if (!featureName) return "";

			const includedUsage = item.included_usage;

			if (
				includedUsage !== undefined &&
				includedUsage !== "inf" &&
				includedUsage !== 0
			) {
				const interval = item.interval ? `per ${item.interval}` : "";
				return `${includedUsage} ${featureName} ${interval}`.trim();
			}

			if (includedUsage === 0) {
				return "";
			}

			if (includedUsage === "inf") {
				return `Unlimited ${featureName.toLowerCase()}`;
			}

			return featureName;
		})
		.filter((feature) => feature.length > 0);
}

export default function BillingPage() {
	const { products, isLoading: productsLoading } = usePricingTable();
	const {
		checkout,
		attach,
		customer,
		isLoading: customerLoading,
	} = useCustomer({
		expand: ["invoices"],
	});
	const [pendingCheckout, setPendingCheckout] = useState<CheckoutResult | null>(
		null,
	);
	const [loading, setLoading] = useState<string | null>(null);
	const [isYearly, setIsYearly] = useState(true);
	const [dateSortOrder, setDateSortOrder] = useState<"asc" | "desc">("desc");
	const invoiceListId = useId();
	const freeFeatureListId = useId();
	const proFeatureListId = useId();

	const invoices = customer?.invoices ?? [];

	const sortedInvoices = useMemo(() => {
		return [...invoices].sort((a, b) => {
			const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
			const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
			return dateSortOrder === "desc" ? dateB - dateA : dateA - dateB;
		});
	}, [invoices, dateSortOrder]);

	const activeProduct = customer?.products.find(
		(p) => p.status === "active" || p.status === "trialing",
	);
	const isPro =
		activeProduct?.id === "pro" || activeProduct?.id === "pro_yearly";
	const isTrialing = activeProduct?.status === "trialing";

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
			<PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="w-full space-y-6 px-4 lg:px-6">
					<div className="space-y-1">
						<Skeleton className="h-9 w-32" />
						<Skeleton className="h-5 w-64" />
					</div>
					<div className="grid gap-6 lg:grid-cols-2">
						<Skeleton className="h-96 rounded-[20px]" />
						<Skeleton className="h-96 rounded-[20px]" />
					</div>
				</div>
			</PageContainer>
		);
	}

	const freeProduct = products?.find((p) => p.id === "free");
	const proMonthlyProduct = products?.find((p) => p.id === "pro");
	const proYearlyProduct = products?.find((p) => p.id === "pro_yearly");
	const proProduct = isYearly ? proYearlyProduct : proMonthlyProduct;
	const proPrice = proProduct
		? getProductPrice(proProduct)
		: { amount: 0, interval: isYearly ? "year" : "month" };

	const freeFeatures = getProductFeatures(freeProduct);
	const proFeatures = getProductFeatures(proMonthlyProduct);

	const confirmTexts = pendingCheckout
		? getConfirmationTexts(pendingCheckout)
		: null;

	return (
		<PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="w-full space-y-6 px-4 lg:px-6">
				<div className="space-y-1">
					<h1 className="font-bold text-3xl tracking-tight">Billing</h1>
					<p className="text-muted-foreground">
						View and manage your billing plan
					</p>
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="font-semibold text-lg">Plans</h2>
							<p className="text-muted-foreground text-sm">
								Upgrade or change your plan. Pro includes a 3 day free trial.
							</p>
						</div>
						<Tabs
							value={isYearly ? "yearly" : "monthly"}
							onValueChange={(value) => setIsYearly(value === "yearly")}
						>
							<TabsList variant="line">
								<TabsTrigger value="monthly">Monthly</TabsTrigger>
								<TabsTrigger
									value="yearly"
									className="flex items-center gap-1.5"
								>
									Yearly
									<span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
										Save 20%
									</span>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<div className="grid gap-6 lg:grid-cols-2">
						<TitleCard
							heading={
								freeProduct?.display?.name ?? freeProduct?.name ?? "Free"
							}
							className={cn(
								!isPro && "ring-primary ring-2",
								isPro &&
									freeProduct &&
									"transition-all hover:ring-2 hover:ring-muted-foreground/20",
							)}
							action={!isPro && <Badge>Current</Badge>}
						>
							<div className="space-y-4">
								<div>
									<p className="text-muted-foreground text-sm">
										{freeProduct?.display?.description ?? "For Hobbyists"}
									</p>
									<div className="mt-2 flex items-end">
										<span className="text-3xl font-bold leading-none">$</span>
										<Counter
											value={0}
											fontSize={30}
											padding={0}
											gap={0}
											places={[1]}
											fontWeight={700}
											gradientHeight={0}
										/>
										<span className="text-muted-foreground text-sm font-normal ml-1 mb-0.5">
											/month
										</span>
									</div>
								</div>

								{freeProduct && !isPro ? (
									<Button variant="outline" className="w-full" disabled>
										Current Plan
									</Button>
								) : freeProduct ? (
									<Button
										variant="outline"
										className="w-full"
										onClick={() => handleCheckout(freeProduct.id)}
										disabled={loading !== null}
									>
										{loading === freeProduct.id
											? "Loading..."
											: "Downgrade to Free"}
									</Button>
								) : (
									<Button variant="outline" className="w-full" disabled>
										Current Plan
									</Button>
								)}

								<ul className="space-y-2.5 pt-2">
									{freeFeatures.map((feature) => (
										<li
											key={`${freeFeatureListId}-${feature}`}
											className="flex items-center gap-2 text-sm"
										>
											<HugeiconsIcon
												icon={CheckmarkCircle02Icon}
												className="size-4 text-emerald-500"
											/>
											<span>{feature}</span>
										</li>
									))}
								</ul>
							</div>
						</TitleCard>

						<TitleCard
							heading="Pro"
							className={cn(
								isPro && "ring-primary ring-2",
								!isPro &&
									proProduct &&
									"transition-all hover:ring-2 hover:ring-primary/50",
							)}
							action={
								<div className="flex items-center gap-2">
									{isPro && (
										<Badge variant={isTrialing ? "outline" : "default"}>
											{isTrialing ? "Trial" : "Current"}
										</Badge>
									)}
								</div>
							}
						>
							<div className="space-y-4">
								<div>
									<p className="text-muted-foreground text-sm">
										{proProduct?.display?.description ?? "For Small Teams"}
									</p>
									<div className="mt-2 flex items-end">
										<span className="text-3xl font-bold leading-none">$</span>
										<Counter
											value={proPrice.amount}
											fontSize={30}
											padding={0}
											gap={0}
											fontWeight={700}
											gradientHeight={0}
										/>
										<span className="text-muted-foreground text-sm font-normal ml-1 mb-0.5">
											/{isYearly ? "year" : "month"}
										</span>
									</div>
								</div>

								{proProduct && isPro ? (
									<Button className="w-full" disabled>
										{isTrialing ? "Trial Active" : "Current Plan"}
									</Button>
								) : proProduct ? (
									<Button
										className="w-full"
										onClick={() => handleCheckout(proProduct.id)}
										disabled={loading !== null}
									>
										{loading === proProduct.id
											? "Loading..."
											: getPricingButtonText(proProduct)}
									</Button>
								) : (
									<Button className="w-full" disabled>
										Upgrade to Pro
									</Button>
								)}

								<ul className="space-y-2.5 pt-2">
									{proFeatures.map((feature) => (
										<li
											key={`${proFeatureListId}-${feature}`}
											className="flex items-center gap-2 text-sm"
										>
											<HugeiconsIcon
												icon={CheckmarkCircle02Icon}
												className="size-4 text-emerald-500"
											/>
											<span>{feature}</span>
										</li>
									))}
								</ul>
							</div>
						</TitleCard>
					</div>
				</div>

				<div className="space-y-3">
					<h2 className="font-semibold text-lg">Invoices</h2>
					<div className="overflow-hidden rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead
										className="w-[140px] cursor-pointer select-none transition-colors hover:text-foreground"
										onClick={() =>
											setDateSortOrder(
												dateSortOrder === "desc" ? "asc" : "desc",
											)
										}
									>
										<span className="inline-flex items-center gap-1">
											Date
											<HugeiconsIcon
												icon={
													dateSortOrder === "desc"
														? ArrowDown01Icon
														: ArrowUp01Icon
												}
												className="size-3.5"
											/>
										</span>
									</TableHead>
									<TableHead className="w-[40%]">Description</TableHead>
									<TableHead className="w-[120px]">Amount</TableHead>
									<TableHead className="w-[120px]">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedInvoices.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-muted-foreground h-24 text-center"
										>
											No invoices yet
										</TableCell>
									</TableRow>
								) : (
									sortedInvoices.map((invoice) => (
										<TableRow
											key={`${invoiceListId}-${invoice.created_at}-${invoice.total}`}
											className={cn(
												invoice.hosted_invoice_url &&
													"cursor-pointer transition-colors hover:bg-muted/50",
											)}
											onClick={() => {
												if (invoice.hosted_invoice_url) {
													window.open(invoice.hosted_invoice_url, "_blank");
												}
											}}
										>
											<TableCell className="w-[140px]">
												{invoice.created_at
													? new Date(invoice.created_at).toLocaleDateString()
													: "-"}
											</TableCell>
											<TableCell className="whitespace-normal break-words">
												{getInvoiceDescription(invoice.product_ids)}
											</TableCell>
											<TableCell className="w-[120px] tabular-nums">
												{invoice.total !== undefined
													? `$${invoice.total.toFixed(2)}`
													: "-"}
											</TableCell>
											<TableCell className="w-[120px]">
												<Badge
													variant={
														invoice.status === "paid" ? "default" : "secondary"
													}
													className={cn(
														invoice.status === "paid" &&
															"bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15",
													)}
												>
													{(invoice.status ?? "pending")
														.charAt(0)
														.toUpperCase() +
														(invoice.status ?? "pending").slice(1)}
												</Badge>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</div>

			{pendingCheckout && confirmTexts && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-background w-full max-w-md rounded-xl border p-6 shadow-xl">
						<h2 className="mb-2 text-xl font-semibold">{confirmTexts.title}</h2>
						<p className="text-muted-foreground mb-4">{confirmTexts.message}</p>

						{pendingCheckout.total !== undefined &&
							pendingCheckout.total > 0 && (
								<p className="mb-4 text-lg font-medium">
									Total: ${pendingCheckout.total.toFixed(2)}
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
		</PageContainer>
	);
}
