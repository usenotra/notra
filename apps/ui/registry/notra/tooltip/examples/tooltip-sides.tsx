import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDES = ["top", "right", "bottom", "left"] as const;

export default function TooltipSidesExample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-12">
      <TooltipProvider>
        {SIDES.map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger
              render={<Button className="capitalize" variant="outline" />}
            >
              {side}
            </TooltipTrigger>
            <TooltipContent side={side}>Opens on the {side}</TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
