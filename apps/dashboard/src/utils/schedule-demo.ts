import { toast } from "sonner";

const CAL_NAMESPACE = "15min";
const CAL_TRIGGER_SELECTOR = `[data-cal-namespace="${CAL_NAMESPACE}"]`;

let calEmbedPromise: Promise<void> | null = null;

/**
 * Loads the Cal.com embed on demand. Doing this in a mount effect pulled a
 * third-party script into every dashboard navigation; the booking modal is only
 * ever opened from an explicit user action.
 */
async function loadCalEmbed(): Promise<void> {
  const { getCalApi } = await import("@calcom/embed-react");
  const cal = await getCalApi({ namespace: CAL_NAMESPACE });
  cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
}

export async function scheduleDemo(): Promise<void> {
  try {
    calEmbedPromise ??= loadCalEmbed();
    await calEmbedPromise;
  } catch {
    calEmbedPromise = null;
    toast.error("Failed to open booking. Please try again.");
    return;
  }

  // The embed listens for clicks on the `data-cal-link` trigger at the document
  // level, so the hidden button opens the modal once the script is ready.
  document.querySelector<HTMLButtonElement>(CAL_TRIGGER_SELECTOR)?.click();
}
