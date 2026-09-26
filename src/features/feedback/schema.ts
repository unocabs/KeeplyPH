import { z } from 'zod';
export const feedbackStatusSchema = z.object({
  claimed: z.boolean(), permanent: z.boolean(), eligible: z.boolean(), expires_at: z.string().nullable(),
});
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
export type FeedbackResult = { error?: string; success?: string; status?: FeedbackStatus };
export const feedbackInputSchema = z.object({
  id: z.string().uuid(), kind: z.enum(['problem', 'suggestion', 'general']),
  summary: z.string().trim().min(5).max(120), notes: z.string().trim().max(2000),
});
