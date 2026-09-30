export interface SkillSummary {
  name: string;
  description: string;
}

export interface SkillContent extends SkillSummary {
  content: string;
}

export interface CreateSkillInput {
  name: string;
  description: string;
  content: string;
}

export interface SkillServiceContext {
  organizationId: string;
}

export interface ListSkillsOptions {
  limit?: number;
  offset?: number;
}
