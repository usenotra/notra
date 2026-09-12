export const GEO_ANSWER_SEARCHED_THE_WEB = "Searched the web";

export const GEO_ANSWER_SEARCH_SKIN_CLASS = {
  chatgpt: {
    root: "font-sans",
    title: "text-muted-foreground text-[15px] leading-7",
    query: "text-muted-foreground text-[13.5px] leading-5",
    sourceTitle: "text-foreground text-[13.5px] leading-5",
    sourceDomain: "text-muted-foreground",
  },
  claude: {
    root: "",
    title:
      "font-serif text-[16px] leading-none tracking-[-0.01em] text-[#8a8680]",
    query:
      "dark:text-muted-foreground font-sans text-[13px] leading-5 text-[#5c5a55]",
    sourceTitle:
      "font-sans text-[13.5px] leading-5 text-[#1f1f1f] dark:text-foreground",
    sourceDomain: "text-[#8a8680] dark:text-muted-foreground",
  },
  gemini: {
    root: "font-sans",
    title: "dark:text-muted-foreground text-[14px] leading-5 text-[#5f5f5f]",
    query: "dark:text-muted-foreground text-[13.5px] leading-5 text-[#5f5f5f]",
    sourceTitle: "dark:text-foreground text-[13.5px] leading-5 text-[#1f1f1f]",
    sourceDomain: "text-muted-foreground",
  },
} as const;
