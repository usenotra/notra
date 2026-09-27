export function getStatusCodeClassName(statusCode: number | null): string {
  if (statusCode === null) {
    return "text-muted-foreground";
  }
  if (statusCode >= 200 && statusCode < 300) {
    return "text-success";
  }
  if (statusCode >= 300 && statusCode < 400) {
    return "text-warning";
  }
  return "text-destructive";
}
