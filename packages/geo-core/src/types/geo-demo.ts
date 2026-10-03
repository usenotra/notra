export interface GeoDemoBrands {
  companyName: string;
  competitors: string[];
}

export interface GeoDemoJudgeInput {
  companyName?: string;
  aliases?: string[];
  userPrompt?: string;
  assistantAnswer?: string;
}
