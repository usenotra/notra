import { Badge } from "@notra/ui/components/ui/badge";

export function TriggerStatusBadge({ enabled }: { enabled: boolean }) {
	return (
		<Badge variant={enabled ? "default" : "secondary"}>
			{enabled ? "Active" : "Paused"}
		</Badge>
	);
}
