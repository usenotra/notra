export type NlwebResult = {
  "@context": "https://schema.org";
  "@type": "WebPage";
  name: string;
  url: string;
  description: string;
  grounding: {
    source: string;
  };
};

type NlwebResponseMeta = {
  response_type: "answer" | "failure";
  response_format?: "conversational_search";
  version: "0.55";
  streaming?: true;
};

type NlwebAnswer = {
  _meta: NlwebResponseMeta & { response_type: "answer" };
  results: NlwebResult[];
};

export type NlwebFailure = {
  _meta: NlwebResponseMeta & { response_type: "failure" };
  error: {
    code: "NO_RESULTS" | "UNSUPPORTED_FORMAT" | "UNSUPPORTED_MODE";
    message: string;
  };
};

export type NlwebResponse = NlwebAnswer | NlwebFailure;
