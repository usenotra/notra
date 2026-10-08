export interface WorkerBindings {
  readonly DATABASE_URL: string;
  readonly WEBHOOK_ENCRYPTION_KEY: string;
  readonly DELIVERY_QUEUE: Queue<{ deliveryId: string }>;
}
