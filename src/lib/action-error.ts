// Browser fetch failures differ between Safari, Chrome and Firefox.
export function actionError(error: unknown, fallback = 'Unable to save. Please try again.'): string {
  const message = error instanceof Error ? error.message : '';
  if (/load failed|failed to fetch|fetch failed|networkerror|network request failed|failed to find server action|server action.*not found/i.test(message)) {
    return 'We couldn’t confirm the save. Your entered details are still here. Check your connection and try saving again. If it keeps failing, open Reminders to check whether it saved before reloading.';
  }
  return message || fallback;
}
