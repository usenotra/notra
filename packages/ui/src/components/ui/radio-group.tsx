"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "@notra/ui/lib/utils";
import type * as React from "react";

function RadioGroup({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive>) {
	return (
		<RadioGroupPrimitive className={cn("grid gap-2", className)} {...props} />
	);
}

function RadioGroupItem({
	className,
	...props
}: React.ComponentProps<typeof Radio.Root>) {
	return (
		<Radio.Root
			className={cn(
				"group/radio aspect-square size-4 shrink-0 rounded-full border border-input shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary",
				className,
			)}
			{...props}
		>
			<Radio.Indicator className="flex size-full items-center justify-center">
				<div className="size-1.5 rounded-full bg-primary-foreground" />
			</Radio.Indicator>
		</Radio.Root>
	);
}

export { RadioGroup, RadioGroupItem };