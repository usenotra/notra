export interface GatewaySpendRow {
  model?: string;
  tag?: string;
  user?: string;
  total_cost: number;
  market_cost: number;
  request_count: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  cache_creation_input_tokens: number;
}

export interface GatewaySpendReports {
  models: GatewaySpendRow[];
  tags: GatewaySpendRow[];
  organizations: GatewaySpendRow[];
}
