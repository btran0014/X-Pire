/**
 * Turns low-level errors into something a person can act on. The free Supabase project pauses
 * after about a week without use; while paused (or offline) requests fail at the network level.
 */
export function describeError(error: unknown, fallback = 'Something went wrong.'): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  if (
    /network request failed|failed to fetch|fetch failed|networkerror|load failed|timed? ?out/i.test(
      message,
    )
  ) {
    return "Can't reach the server. Check your internet connection. If X-Pire hasn't been used for a while, the free server may be asleep: restore the project in the Supabase dashboard.";
  }
  if (/jwt|token.*expired|not authorized|401/i.test(message)) {
    return 'Your session expired. Close and reopen the app.';
  }
  if (/5\d\d|service unavailable|bad gateway/i.test(message)) {
    return 'The server is having trouble right now. Try again in a minute.';
  }
  return fallback;
}
