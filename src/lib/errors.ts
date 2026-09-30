const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Please sign in to continue.', ACCOUNT_UNAVAILABLE: 'This account is unavailable or being deleted.',
  NOT_FOUND: 'That reminder is no longer available.', CONFLICT: 'This reminder changed in another window. Reload before saving.',
  
  REMINDER_LIMIT: 'Your alert slots are in use. Move a slot from another reminder or add five slots.',
  DRAFT_LIMIT: 'You have 3 unfinished reminders. Finish or remove a draft before adding another.',
  FILE_COUNT_LIMIT: 'You can attach up to 6 files to a reminder.', STORAGE_LIMIT: 'Your document storage is full. Remove an unneeded file to make room. Alert packs do not add file storage.',
  FILE_TOO_LARGE: 'Choose a file smaller than 10 MB.', INVALID_FILE: 'This file could not be validated. Try a JPEG, PNG, WebP, or PDF.',
  UPLOAD_EXPIRED: 'This upload expired. Remove it and select the file again.', RATE_LIMITED: 'A few too many requests. Please try again shortly.',
  PACK_ALREADY_OWNED: 'Your permanent alert pack is already active. Choose permanent slots to add more.', SLOT_PACK_LIMIT: 'You can purchase up to 100 extra permanent slots.', DATE_REQUIRED: 'Add an important date to get started.', DATE_LIMIT: 'You can track up to 10 dates per reminder.', DOCUMENTS_NOT_ALLOWED: 'This template stores dates only, without documents.',
  INVALID_INPUT: 'Please check the information and try again.',
};
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const text = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  const key = Object.keys(messages).find(key => text.includes(key));
  return key ? messages[key] : fallback;
}
