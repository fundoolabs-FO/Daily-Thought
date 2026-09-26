/** Only allow same-origin relative paths as post-auth redirect targets. */
export function safeNext(next: string | null | undefined, fallback = "/today") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
