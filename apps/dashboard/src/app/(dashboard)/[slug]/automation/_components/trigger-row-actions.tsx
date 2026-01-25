import {
	Delete02Icon,
	MoreVerticalIcon,
	PauseIcon,
	PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";

import type { Trigger } from "@/types/triggers";

interface TriggerRowActionsProps {
	trigger: Trigger;
	onToggle: (trigger: Trigger) => void;
	onDelete: (triggerId: string) => void;
}

export function TriggerRowActions({
	trigger,
	onToggle,
	onDelete,
}: TriggerRowActionsProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex size-8 items-center justify-center rounded-md hover:bg-accent">
				<HugeiconsIcon
					className="size-4 text-muted-foreground"
					icon={MoreVerticalIcon}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onToggle(trigger)}>
					<HugeiconsIcon
						className="size-4"
						icon={trigger.enabled ? PauseIcon : PlayIcon}
					/>
					{trigger.enabled ? "Pause" : "Enable"}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => onDelete(trigger.id)}
					variant="destructive"
				>
					<HugeiconsIcon className="size-4" icon={Delete02Icon} />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
