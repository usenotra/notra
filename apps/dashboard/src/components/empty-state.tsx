import { Button } from "@notra/ui/components/ui/button";
import type React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.ComponentProps<"div"> {
	title: string;
	description: string;
	action?: React.ReactNode;
	actionLabel?: string;
	actionVariant?: React.ComponentProps<typeof Button>["variant"];
	onActionClick?: React.ComponentProps<"button">["onClick"];
	actionIcon?: React.ReactNode;
}

function EmptyState({
	title,
	description,
	action,
	actionLabel,
	actionVariant = "default",
	onActionClick,
	actionIcon,
	className,
	...props
}: EmptyStateProps) {
	const renderedAction =
		action ??
		(actionLabel ? (
			<Button onClick={onActionClick} size="sm" variant={actionVariant}>
				{actionIcon ? <span className="mr-2">{actionIcon}</span> : null}
				{actionLabel}
			</Button>
		) : null);

	return (
		<div
			className={cn(
				"rounded-2xl border border-dashed p-12 text-center",
				className,
			)}
			{...props}
		>
			<h3 className="font-semibold text-lg">{title}</h3>
			<p className="mt-1 text-muted-foreground text-sm">{description}</p>
			{renderedAction ? (
				<div className="mt-4 flex justify-center">{renderedAction}</div>
			) : null}
		</div>
	);
}

export { EmptyState };
