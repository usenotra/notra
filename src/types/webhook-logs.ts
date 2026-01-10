export interface Log {
  id: string;
  organizationId: string;
  status: number;
  method: string;
  path: string;
  payload: unknown;
  response: unknown;
  createdAt: string;
}

export interface LogsResponse {
  logs: Log[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
