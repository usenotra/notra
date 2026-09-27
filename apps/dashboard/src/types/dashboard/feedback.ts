export type FeedbackSentiment = "sad_crying" | "sad" | "happy" | "excited";

export interface FeedbackSentimentOption {
  value: FeedbackSentiment;
  emoji: string;
}

export interface FeedbackContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openFeedback: () => void;
}

export interface FeedbackFormProps {
  onSubmitted?: () => void;
  autoFocus?: boolean;
}
