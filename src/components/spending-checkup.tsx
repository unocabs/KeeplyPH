import Link from 'next/link';
import { ArrowRight, CalendarDays, ChevronDown, CircleHelp, Sparkles } from 'lucide-react';
import {premiumExpiry,premiumExpiryHeading} from '@/features/premium/discovery';
import { formatDate, formatMoney,type Usage } from '@/lib/domain';
import { formatTotal, paymentTotal } from '@/features/items/insights';
import { checkupHref, checkupInsights, spendingCategories, spendingCategoryLabel, spendingShare, type CheckupActions, type CheckupRow, type SpendingCheckup } from '@/features/premium/checkup';
import { premiumProducts } from '@/features/premium/products';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './spending-checkup.module.css';
import { CheckupCapture, CheckupRangeControls } from './checkup-controls';
import { CheckupChangeSummary } from './checkup-changes';

export function SpendingCheckupInvitation({usage}:{usage:Usage}) {
 return <div data-premium-surface="checkup"><Link className="back-link" href="/dashboard">← Household overview</Link>
   <div className="page-heading"><div><span className="eyebrow">KEEPLY PREMIUM</span><h1>Your household ahead</h1><p>See which upcoming period needs the most preparation and what’s driving your saved costs.</p></div></div>
   <section data-premium-preview="" data-premium-expired={premiumExpiry(usage)?'':undefined} className={styles.invitation} aria-labelledby="checkup-invitation-heading"><Sparkles size={30} aria-hidden="true"/><div><h2 id="checkup-invitation-heading">{premiumExpiry(usage)?premiumExpiryHeading(usage):'Turn your saved expenses into a clearer plan'}</h2><p>Premium brings your highest-cost period, household category breakdown, and a practical planning takeaway into one checkup.</p><p>Your 30-day calendar, spending totals, amount editing, and payment actions stay available with Free.</p><p className={styles.price}>{formatMoney(premiumProducts.premium_30.amount)} for 30 days · No automatic renewal</p><div className="hero-actions spaced"><Link className="button primary" href="/demo/checkup" data-premium-event="premium_sample_opened">Explore a sample account <ArrowRight size={16} aria-hidden="true"/></Link><Link className="button secondary" href="/settings/billing">See Premium plans</Link><Link className="text-button" href="/items/payments">View my Free payment plan</Link></div></div></section>
 </div>;
}

/** Projected dates have no editable occurrence. Existing dates carry a stale-link guard. */
function expenseHref(row:CheckupRow,base:string,edit=false) {
 const query=edit&&!row.projected&&row.occurrence_id
   ? '?'+new URLSearchParams({date:row.date_id,occurrence:row.occurrence_id,action:'amount'}) : '';
 return `${base}/items/${row.item_id}${query}#date-${row.date_id}`;
}

export function SpendingCheckupView({plan,demo=false,paged=false,actions={}}:{plan:SpendingCheckup;demo?:boolean;paged?:boolean;actions?:CheckupActions}) {
 const base=demo?'/demo':'',insights=checkupInsights(plan),highest=insights?.highest,total=paymentTotal(plan);
 const known=plan.confirmed_count+plan.estimated_count+plan.unverified_count;
 const href=(filter:{week?:string|null;category?:string|null;before?:string;id?:string}={})=>{
   return checkupHref(base,plan,filter)+'#checkup-expenses';
 };
 const categories=[...plan.categories].sort((a,b)=>spendingCategories.indexOf(a.category)-spendingCategories.indexOf(b.category));
 const selectedWeek=plan.weeks.find(week=>week.starts_on===plan.week),last=plan.rows.at(-1);
 const selection=[selectedWeek?`${formatDate(selectedWeek.starts_on,true)} to ${formatDate(selectedWeek.ends_on,true)}`:null,plan.category?spendingCategoryLabel(plan.category):null].filter(Boolean).join(' · ');
 // A filtered page cannot identify the full account's next expense. Keep that prompt general.
 const fullFirstPage=!selection&&!paged;
 const review=fullFirstPage ? plan.unset_count>0 ? plan.rows.find(row=>row.amount_minor==null)
   : plan.estimated_count>0 ? plan.rows.find(row=>row.certainty==='estimated')
   : plan.rows[0] : undefined;
 const needsReview=plan.unset_count+plan.estimated_count>0;
 const reviewTitle=plan.total===0?'Build a useful checkup':plan.unset_count>0?'Add the missing amounts':plan.estimated_count>0?'Check an estimated cost':'Prepare for your next expense';
 const reviewAction=review ? review.projected?'Review saved schedule':needsReview?review.amount_minor==null?'Add amount':'Review expected amount':'View expense' : plan.total===0?'Add a household expense':'Review expected costs';
 const first=plan.rows[0];
 return <div className={styles.checkup} data-premium-surface="checkup">
   <Link className="back-link" href={base+'/dashboard'}>← Household overview</Link>
   <header className={styles.heading}><span className="eyebrow">{demo?'PREMIUM SAMPLE · FICTIONAL EXPENSES':'KEEPLY PREMIUM'}</span><h1>Your household ahead</h1><p>{formatDate(plan.today,true)} to {formatDate(plan.ends_on,true)}</p></header>
   {plan.mode&&<CheckupRangeControls plan={plan} demo={demo} savePaydayAction={actions.savePayday}/>}
   <section className={styles.total} aria-labelledby="checkup-total-heading">
     <h2 id="checkup-total-heading" className={styles.heroEyebrow}>{plan.mode==='payday'?'BEFORE YOUR NEXT PAYDAY':'YOUR UPCOMING HOUSEHOLD COSTS'}</h2>
     {known>0?<><p className={styles.totalAmount}>{formatTotal(total)}</p><p className={styles.totalLabel}>{total==='0'?'Saved amounts total zero':plan.unset_count>0?'Known upcoming costs':'To prepare for upcoming expenses'}</p></>:<p className={styles.totalEmpty}>{plan.total>0?'Amounts not added yet':'No upcoming expenses'}</p>}
     <p className={styles.count}>{plan.total} upcoming {plan.total===1?'expense':'expenses'} in this period</p>
     {plan.estimated_count>0&&<ul className={styles.certainty} aria-label="Estimated costs included">
       {plan.estimated_count>0&&<li className={styles.estimated}>{formatTotal(plan.estimated_minor)} estimated</li>}
     </ul>}
     {plan.unset_count>0&&<p className={styles.missing}>{plan.unset_count} upcoming {plan.unset_count===1?'expense needs':'expenses need'} an amount. Missing amounts are excluded from the total.</p>}
   </section>
   {plan.comparison&&<CheckupChangeSummary plan={plan} demo={demo}/>}
   {actions.capture&&<CheckupCapture key={plan.today} captureAction={actions.capture} firstUse={plan.comparison?.status==='first_use'}/>}
   <section className={styles.nextStep} aria-labelledby="checkup-next-heading">
     <p className={styles.eyebrow}><CircleHelp size={15} aria-hidden="true"/>{needsReview?'An amount to check':'Your next step'}</p>
     <h2 id="checkup-next-heading">{reviewTitle}</h2>
     {review?<div className={styles.reviewIdentity}><ItemIdentityIcon item={review.identity}/><div><strong>{review.product_name}</strong><p>{review.label} · {formatDate(review.due_on,true)}</p><p>{review.amount_minor==null?'Amount not yet known':formatMoney(review.amount_minor)+(review.certainty==='estimated'?' estimated':'')}</p></div></div>:<p className={styles.muted}>{plan.total===0?'Add a bill or expected maintenance cost to see what your household needs to prepare for.':plan.unset_count>0?'Add expected costs when you know them. An estimate can help you prepare.':needsReview?'Review the amounts saved in your household plan before preparing for upcoming expenses.':'Review your saved upcoming expenses and their dates.'}</p>}
     <Link className={styles.action} href={review?expenseHref(review,base,needsReview):base+(plan.total===0?'/add?category=bills':'/items/payments')}>{reviewAction}<ArrowRight size={16} aria-hidden="true"/></Link>
     {plan.total===0&&!demo&&<Link className="text-button" href="/demo/checkup" data-premium-event="premium_sample_opened">Explore a sample account</Link>}
   </section>
   <section className={styles.expenses} aria-labelledby="checkup-expenses">
     <div className={styles.listHeading}><div><h2 tabIndex={-1} id="checkup-expenses">{selection||'What’s coming up'}</h2><p className={styles.muted}>{plan.filtered_total} {plan.filtered_total===1?'expense':'expenses'}{selection?' in this selection':paged?' in the full plan':' in date order'}{plan.has_more?' · More on the next page':''}</p></div>{(selection||paged)&&<Link className="text-button" href={href()}>Show all expenses</Link>}</div>
     {fullFirstPage&&first&&<div className={styles.timelineStart}><span>Today · {formatDate(plan.today)}</span>{first.due_on>plan.today&&<p>No upcoming expenses saved before {formatDate(first.due_on,true)}</p>}</div>}
     <ol className={styles.rows}>{plan.rows.map((row,index)=>{
       const stamp=new Date(row.due_on+'T00:00:00Z'),dateId=`checkup-date-${index}`;
       return <li key={row.date_id+':'+row.due_on}>
         <time id={dateId} className={styles.date} dateTime={row.due_on} aria-label={formatDate(row.due_on,true)}><span>{new Intl.DateTimeFormat('en-PH',{month:'short',timeZone:'UTC'}).format(stamp)}</span><b>{stamp.getUTCDate()}</b>{row.due_on.slice(0,4)!==plan.today.slice(0,4)&&<small>{stamp.getUTCFullYear()}</small>}</time>
         <Link className={styles.rowCard} aria-describedby={dateId} data-premium-event="insight_source_opened" data-premium-insight="contributors" href={expenseHref(row,base)}>
           <ItemIdentityIcon item={row.identity}/><div className={styles.rowContent}><div className={styles.rowHeading}><strong>{row.product_name}</strong><span className={styles.rowAmount}>{row.amount_minor==null?'Amount to add':formatMoney(row.amount_minor)}</span></div><div className={styles.rowDetails}><span>{row.label}</span>{(row.amount_minor==null||row.certainty==='estimated')&&<span className={row.certainty==='estimated'?styles.estimateTag:undefined}>{row.amount_minor==null?'Not included in total':'Estimated'}</span>}{row.projected&&<span className={styles.projected}>Projected from saved schedule</span>}</div></div><ArrowRight size={15} aria-hidden="true"/>
         </Link>
       </li>;
     })}</ol>
     {!plan.rows.length&&<p className={styles.empty}>{plan.filtered_total===0?'No upcoming expenses in this selection.':'No more expenses on this page.'}</p>}
     {fullFirstPage&&last&&!plan.has_more&&last.due_on<plan.ends_on&&<p className={styles.timelineEnd}>No more upcoming expenses saved through {formatDate(plan.ends_on,true)}</p>}
     <div className={styles.actions}>{paged&&<Link className="button secondary" href={href({week:plan.week,category:plan.category})}>First page</Link>}{plan.has_more&&last&&<Link className="button secondary" href={href({week:plan.week,category:plan.category,before:last.due_on,id:last.date_id})}>More expenses <ArrowRight size={16} aria-hidden="true"/></Link>}</div>
   </section>
   {(plan.after_payday_count??0)>0&&<Link className={styles.afterPayday} href={checkupHref(base,{...plan,mode:'30'})}>{plan.after_payday_count} more {plan.after_payday_count===1?'expense':'expenses'} on or after payday in the next 30 days <ArrowRight size={16} aria-hidden="true"/></Link>}
   {plan.total>0&&<details className={styles.breakdown} open={Boolean(selection)}>
     <summary>Cost breakdown<ChevronDown size={18} aria-hidden="true"/></summary>
     {highest&&insights&&<section className={styles.period} aria-labelledby="checkup-period-heading">
       <h2 id="checkup-period-heading"><CalendarDays size={18} aria-hidden="true"/>{insights.only_period?'Your costs are grouped together':insights.ties>1?'Joint highest-cost periods':'Highest-cost upcoming period'}</h2>
       <p>{formatDate(highest.starts_on,true)} to {formatDate(highest.ends_on,true)}</p>
       <p>{insights.share} of recorded upcoming costs · {highest.total} {highest.total===1?'expense':'expenses'}</p>
       {insights.ties>1&&<p className={styles.muted}>{insights.ties} periods share this total. The earliest is shown.</p>}
       {plan.unset_count>0&&<p className={styles.muted}>Missing amounts can change this comparison.</p>}
       <Link className={styles.action} data-premium-event="checkup_insight_inspected" data-premium-insight="period" href={href({week:highest.starts_on})}>View contributing expenses <ArrowRight size={16} aria-hidden="true"/></Link>
       <p className={styles.note}>Seven-day periods start on {formatDate(plan.today,true)}. The final period ends on {formatDate(plan.ends_on,true)}.</p>
     </section>}
     <section aria-labelledby="checkup-categories-heading"><h2 id="checkup-categories-heading">Costs by household category</h2><ul className={styles.categories}>{categories.map(category=><li key={category.category}><Link data-premium-event="checkup_insight_inspected" data-premium-insight="category" href={href({category:category.category})}><span><strong>{spendingCategoryLabel(category.category)}</strong>{category.unset_count>0&&<small>{category.unset_count} {category.unset_count===1?'amount':'amounts'} to add</small>}{BigInt(category.estimated_minor)>0n&&<small>{formatTotal(category.estimated_minor)} estimated</small>}</span><span className={styles.categoryAmount}><strong>{category.known_count?formatTotal(category.total_minor):'Amount unknown'}</strong>{category.known_count>0&&<small>{spendingShare(category.total_minor,total)?spendingShare(category.total_minor,total)+' of recorded costs':'Saved amounts total zero'}</small>}</span><ArrowRight size={16} aria-hidden="true"/></Link></li>)}</ul><p className={styles.note}>Shares use recorded amounts, including estimates. Missing amounts are excluded. Shares are rounded.</p></section>
   </details>}
   <nav className={styles.actions} aria-label="More household planning"><Link href={base+'/items/payments'} className="text-button">Review amounts and payments <ArrowRight size={16} aria-hidden="true"/></Link><Link href={base+'/planner?days=90'} className="text-button">See my household outlook <ArrowRight size={16} aria-hidden="true"/></Link></nav>
   <p className={styles.note}>Based on expenses saved in Keeply. Paid, completed, and overdue dates are excluded.</p>
   {demo&&<p className={styles.note}>Fictional sample expenses. Changes in the sample account are not saved to your household.</p>}
 </div>;
}
