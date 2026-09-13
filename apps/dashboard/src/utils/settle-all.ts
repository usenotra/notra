export async function settleAll(calls: Promise<unknown>[]) {
  const results = await Promise.allSettled(calls);
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (failure) {
    throw failure.reason;
  }
}
