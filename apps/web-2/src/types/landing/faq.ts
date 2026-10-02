export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  defaultOpen: boolean;
};

export type FaqContent = {
  heading: string;
  subcopy: string;
  items: FaqItem[];
};
