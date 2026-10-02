export function redirectToAuthServer(request: Request, target: string) {
  const url = new URL(target);
  url.search = new URL(request.url).search;
  return Response.redirect(url, 308);
}
