import { describe,it,expect } from 'vitest';
import { sampleItems } from '@/lib/demo';
import { todayIn,addMonths } from '@/lib/domain';
import { dateRows,comingUp } from '@/features/items/domain';
import { addIntent,defaultOffsets } from '@/features/templates';
import { dateSchema } from '@/features/items/validation';
describe('expanded item contracts',()=>{
 it('separates upcoming, later, expired and archived dates',()=>{const items=sampleItems(),today=todayIn(),rows=dateRows(items);const upcoming=comingUp(rows,today);expect(upcoming.some(r=>r.item.template_key==='car')).toBe(true);expect(upcoming.some(r=>r.item.template_key==='passport')).toBe(false);expect(upcoming.every(r=>r.occurrence.due_on>=today)).toBe(true);items.forEach(i=>{i.archived_at=new Date().toISOString();});expect(dateRows(items)).toEqual([]);});
 it('retains only supported non-private onboarding intent',()=>{expect(addIntent('car','registration','secret')).toBe('/add/car?focus=registration');expect(addIntent('passport','private-name')).toBe('/add/passport');expect(addIntent('receipt','warranty','appliances')).toBe('/add/receipt?focus=warranty&category=appliances');});
 it('uses calendar-month passport presets and clamps month end',()=>{expect(defaultOffsets('passport','expiration')).toEqual([12,6,3].map(value=>({unit:'months',value})));expect(addMonths('2032-03-31',-1)).toBe('2032-02-29');expect(addMonths('2031-03-31',-1)).toBe('2031-02-28');});
 it('rejects impossible dates and duplicate or invalid offsets',()=>{const valid={kind:'expiration',label:'Passport',due_on:'2032-03-31',reminders_enabled:false,interval_months:null,offsets:[{unit:'months',value:3}]};expect(dateSchema.safeParse(valid).success).toBe(true);expect(dateSchema.safeParse({...valid,due_on:'2031-02-29'}).success).toBe(false);expect(dateSchema.safeParse({...valid,offsets:[{unit:'months',value:25}]}).success).toBe(false);expect(dateSchema.safeParse({...valid,offsets:[...valid.offsets,...valid.offsets]}).success).toBe(false);});
});
