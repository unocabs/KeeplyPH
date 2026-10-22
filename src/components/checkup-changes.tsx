import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, History, Sparkles } from 'lucide-react';
import { checkupHref, type CheckupChange, type SpendingCheckup } from '@/features/premium/checkup';
import { formatTotal } from '@/features/items/insights';
import { formatDate } from '@/lib/domain';
import { ItemIdentityIcon } from './reminder-icon';
import styles from './spending-checkup.module.css';

const reasons:Record<CheckupChange['reason'],string>={added:'Added to this period',removed:'No longer in this upcoming period',amount_added:'Amount added',amount_removed:'Amount needs adding',amount_changed:'Amount changed',estimate_changed:'Estimate updated'};
function changeReason(row:CheckupChange) {
 if(row.reason==='estimate_changed')return row.after_estimated?'Marked as estimated':'Estimate updated';
 if(row.reason==='amount_changed'&&row.before_estimated&&row.after_estimated)return 'Estimate changed';
 return reasons[row.reason];
}
export function checkupDifference(previous:string,current:string) {
 const delta=BigInt(current)-BigInt(previous);
 return delta>0n?`${formatTotal(delta.toString())} more in known costs`:delta<0n?`${formatTotal((-delta).toString())} less in known costs`:'Known costs unchanged';
}
export function CheckupChangeSummary({plan,demo}:{plan:SpendingCheckup;demo:boolean}) {
 const comparison=plan.comparison;
 if(!comparison||comparison.status==='first_use')return null;
 if(comparison.status==='outside_coverage')return <p className={styles.baseline}>Your earlier checkup does not cover all of these dates, so there’s no comparison to show for this period yet. Comparing different date ranges could give a misleading change. Keeply will try to save a new starting point while your plan is open.</p>;
 if(comparison.status!=='available')return null;
 const count=comparison.change_count,first=comparison.rows[0];
 return <section className={styles.changeSummary} aria-labelledby="checkup-change-heading">
   <span className={styles.insightIcon}><History size={19} aria-hidden="true"/></span>
   <div><h2 id="checkup-change-heading">{count?'What changed':'No changes in this period'}</h2><p className={styles.changeHeadline}>{checkupDifference(comparison.previous_minor,comparison.current_minor)}</p>
     <p className={styles.muted}>{demo?'Illustrative comparison':`Compared with your first checkup on ${formatDate(comparison.reviewed_on,true)}`}. Same dates, {formatDate(plan.today,true)} to {formatDate(plan.ends_on,true)}.</p>
     {count===1&&first&&<div className={styles.changePreview}><ItemIdentityIcon item={first.identity}/><span><strong>{first.product_name}</strong><small>{changeReason(first)}</small></span></div>}
     {count>1&&<p className={styles.note}>{count} expenses changed in this period.</p>}
     {!count&&(comparison.current_missing>0||comparison.previous_missing>0)&&<p className={styles.note}>Missing amounts are still excluded.</p>}
     {count>0&&<Link className={styles.action} href={checkupHref(demo?'/demo':'',plan,{view:'changes'})}>See what changed <ArrowRight size={15} aria-hidden="true"/></Link>}
   </div>
 </section>;
}
function changeAmount(row:CheckupChange,side:'before'|'after') {
 const present=side==='before'?row.before_present:row.after_present,amount=side==='before'?row.before_minor:row.after_minor,estimated=side==='before'?row.before_estimated:row.after_estimated;
 return !present?<span className={styles.muted}>{side==='before'?'Not in this period':'No longer upcoming'}</span>:amount==null?<span className={styles.muted}>Amount to add</span>:<><strong>{formatTotal(amount)}</strong>{estimated&&<small>Estimated</small>}</>;
}
export function CheckupChangesView({plan,demo=false}:{plan:SpendingCheckup;demo?:boolean}) {
 const comparison=plan.comparison,base=demo?'/demo':'',available=comparison?.status==='available'?comparison:null;
 return <div className={styles.checkup} data-premium-surface="checkup">
   <Link className="back-link" href={checkupHref(base,plan)}><ArrowLeft size={14} aria-hidden="true"/> Back to my plan</Link>
   <header className={styles.heading}><span className="eyebrow">{demo?'PREMIUM SAMPLE · FICTIONAL COMPARISON':'KEEPLY PREMIUM'}</span><h1>What changed</h1><p>{formatDate(plan.today,true)} to {formatDate(plan.ends_on,true)}{plan.mode==='payday'?' · Before payday':''}</p></header>
   {available?<>
     <section className={styles.changeHero}><span className={styles.heroEyebrow}>YOUR PLAN, EXPLAINED</span><h2>{checkupDifference(available.previous_minor,available.current_minor)}</h2><p>Compared with your first checkup on {formatDate(available.reviewed_on,true)}. Both totals use the dates above.</p>{demo&&<p>Illustrative previous checkup using fictional sample expenses.</p>}</section>
     {available.previous_missing+available.current_missing>0&&<p className={styles.comparisonCaveat}>Only known amounts are compared. Missing amounts: {available.previous_missing} before, {available.current_missing} now. Adding an amount can increase this total without adding a new expense.</p>}
     <div className={styles.listHeading}><h2>{available.change_count?`${available.change_count} ${available.change_count===1?'expense changed':'expenses changed'}`:'No changes in this period'}</h2></div>
     {available.change_count===0&&<p className={styles.muted}>There’s no change list because the upcoming expenses, amounts and estimate labels match the saved checkup for these same dates. Return to your plan to review what’s coming up.</p>}
     <ol className={styles.changeRows}>{available.rows.map(row=><li key={row.date_id+row.due_on} className={styles.changeRow}>
       <div className={styles.changeIdentity}>{row.record_available?<Link href={`${base}/items/${row.item_id}#date-${row.date_id}`}><ItemIdentityIcon item={row.identity}/><span><strong>{row.product_name}</strong><small>{row.label} · {formatDate(row.due_on,true)}</small></span><ArrowUpRight size={17} aria-hidden="true"/></Link>:<><ItemIdentityIcon item={row.identity}/><span><strong>{row.product_name}</strong><small>{row.label} · {formatDate(row.due_on,true)}</small></span></>}</div>
       <p className={styles.changeReason}>{changeReason(row)}</p>
       <div className={styles.amountComparison}><div><span>Previous</span>{changeAmount(row,'before')}</div><ArrowRight size={17} aria-hidden="true"/><div><span>Now</span>{changeAmount(row,'after')}</div></div>
       {row.reason==='removed'&&<p className={styles.note}>{row.record_available?'Open the record to see its latest status.':'The original record was removed. Its earlier amount is shown for comparison.'}</p>}
     </li>)}</ol>
     {available.change_count>0&&!available.rows.length&&<p className={styles.empty}>No more changes on this page. This page starts after the last change in this comparison. Use “Previous changes” to return to the earlier changes.</p>}
     <nav className={styles.actions} aria-label="Change pages">{available.page>0&&<Link className="button secondary" href={checkupHref(base,plan,{view:'changes',changePage:String(available.page-1)})}>Previous changes</Link>}{available.has_more&&<Link className="button secondary" href={checkupHref(base,plan,{view:'changes',changePage:String(available.page+1)})}>More changes <ArrowRight size={16} aria-hidden="true"/></Link>}</nav>
     <section className={styles.reconciliation} aria-labelledby="checkup-reconciliation"><h2 id="checkup-reconciliation">How the totals compare</h2><dl><div><dt>Previous known costs</dt><dd>{available.previous_known?formatTotal(available.previous_minor):'No amounts added'}</dd></div><div><dt>Current known costs</dt><dd>{available.current_known?formatTotal(available.current_minor):'No amounts added'}</dd></div><div><dt>Difference in known costs</dt><dd>{BigInt(available.current_minor)>BigInt(available.previous_minor)?'+':''}{BigInt(available.current_minor)<BigInt(available.previous_minor)?'−':''}{formatTotal((BigInt(available.current_minor)>=BigInt(available.previous_minor)?BigInt(available.current_minor)-BigInt(available.previous_minor):BigInt(available.previous_minor)-BigInt(available.current_minor)).toString())}</dd></div></dl><p className={styles.note}>Includes estimates. Expenses outside these dates are excluded from both checkups. </p></section>
   </>:<section className={styles.changeSummary}><span className={styles.insightIcon}><Sparkles size={20} aria-hidden="true"/></span><div><h2>{comparison?.status==='outside_coverage'?'A new comparison point is needed':comparison?.status==='first_use'?'Start with your first checkup':'Your comparison isn’t ready yet'}</h2><p className={styles.muted}>{comparison?.status==='outside_coverage'?'Your earlier checkup does not cover every date in this period, so a fair comparison isn’t available yet. Open your plan to save a starting point that includes these dates.':comparison?.status==='first_use'?'There isn’t a saved checkup to compare with yet. Open your plan to save today’s first checkup, then return after your expenses change to see what’s different.':'We don’t have comparison information for this view yet. Return to your plan and try opening the change summary again.'}</p></div></section>}
   <details className={styles.comparisonHelp}><summary>How comparisons work</summary><p>Keeply saves the first checkup you open each day. We compare the dates shown here with the most recent earlier day that covers them, or today’s first checkup on your first day. Missing amounts stay outside both totals. Names and logos come from your current records.</p><p>Comparison points contain expense identifiers, dates, amounts and estimate labels. Scheduled maintenance removes them after 36 days. Deleting your account removes them too.</p></details>
   <Link className={styles.action} href={checkupHref(base,plan)}>Back to my plan <ArrowRight size={16} aria-hidden="true"/></Link>
 </div>;
}
