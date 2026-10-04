export function redirectResponse(url: string | URL, status = 307) {
  return Response.redirect(url, status);
}
