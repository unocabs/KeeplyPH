import { z } from 'zod';
export const premiumEventSchema=z.object({
 id:z.uuid(),event:z.enum(['premium_preview_viewed','premium_details_opened','premium_sample_opened','installation_guide_opened','checkup_opened','checkup_preview_opened','checkup_insight_inspected','outlook_month_inspected','insight_source_opened','extended_planner_requested','extended_planner_used','calendar_30d_used','premium_expiry_viewed']),
 surface:z.enum(['dashboard','checkup','outlook','billing','gift']),
 horizon:z.union([z.literal(30),z.literal(90),z.literal(365)]).optional(),
 insight:z.enum(['period','category','month','contributors']).optional(),
}).strict();
export type PremiumEvent=Omit<z.infer<typeof premiumEventSchema>,'id'>;
