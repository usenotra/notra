import { getRequest } from "@tanstack/react-start/server";

export function cacheAuthRequest<TArgs extends readonly unknown[], TResult>(
  lookup: (...args: TArgs) => Promise<TResult>
) {
  const requests = new WeakMap<Request, Map<string, Promise<TResult>>>();
  return (...args: TArgs): Promise<TResult> => {
    const request = getRequest();
    let values = requests.get(request);
    if (!values) {
      values = new Map();
      requests.set(request, values);
    }
    const key = JSON.stringify(args);
    let value = values.get(key);
    if (!value) {
      value = lookup(...args);
      values.set(key, value);
    }
    return value;
  };
}
