/** Only paths inside this app may be used as a "continue to" address. */
export function safeNext(next: string | null | undefined, fallback = "/app") {
  if (!next || !/^\/(?![/\\])[\x21-\x7e]*$/.test(next) || next.includes("\\")) return fallback;
  return next;
}
