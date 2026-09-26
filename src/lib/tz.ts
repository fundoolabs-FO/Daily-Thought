export const TZ_COOKIE = "dt_tz";
export const FRESH_LOGIN_COOKIE = "dt_fresh_login";

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Add days to an ISO date (YYYY-MM-DD) without timezone drift. */
export function addDays(isoDay: string, days: number): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDay(isoDay: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString("en-US", {
    ...opts,
    timeZone: "UTC",
  });
}
