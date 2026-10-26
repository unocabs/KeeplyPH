export type Reaction = 'helpful' | 'easy' | 'love';
export type ReactionTotals = Record<Reaction, number> & { total: number };

// Never turn an unavailable or malformed response into a misleading zero count.
export function parseReactionTotals(value: unknown): ReactionTotals | null {
  if (!value || typeof value !== 'object') return null;
  const counts = value as Record<string, unknown>;
  const { helpful, easy, love } = counts;
  if (![helpful, easy, love].every(count => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0)) return null;
  const total = (helpful as number) + (easy as number) + (love as number);
  if (!Number.isSafeInteger(total)) return null;
  return { helpful: helpful as number, easy: easy as number, love: love as number, total };
}
