export interface CookieJar {
  get(name: string): { value: string } | undefined;
}
