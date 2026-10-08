export function reservedSlugMessage(slug: string, domain: string): string {
  return `${slug} is reserved for ${domain}. Sign in with an @${domain} email address to use it, contact support, or pick another address.`;
}
