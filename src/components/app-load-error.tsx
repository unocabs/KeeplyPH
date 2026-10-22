'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import styles from './app-recovery.module.css';

/** Expected read failures refresh the page; uncaught errors use the boundary's retry. */
export function AppLoadError({retry,planning=false}:{retry?:()=>void;planning?:boolean}) {
 const router=useRouter(),[pending,startTransition]=useTransition();
 return <section className={styles.recovery} aria-labelledby="load-error-heading" aria-busy={pending}>
   <span className={styles.icon}><BookOpen size={26} aria-hidden="true"/></span>
   <p className="eyebrow">A SMALL PAUSE</p>
   <h2 id="load-error-heading">Let’s give that another try</h2>
   <p>{planning?'We couldn’t load your household plan just now.':'We couldn’t load this page just now.'} This doesn’t mean your saved records are empty.</p>
   <div className={styles.hint}><strong>You can still take the next step</strong><p>{planning?'Try again, or open your saved expenses to review their dates and amounts. There’s no need to add them again.':'Try again, or return to your household items and pick up from there.'}</p></div>
   <div className={styles.actions}>
     <button className="button primary" type="button" disabled={pending} onClick={()=>startTransition(()=>retry?retry():router.refresh())}><RefreshCw size={16} aria-hidden="true"/>{pending?'Trying again…':'Try again'}</button>
     <Link className="button secondary" href={planning?'/items/payments':'/items'}>{planning?'View saved expenses':'View household items'}</Link>
   </div>
   <p className={styles.note} role="status">{pending?'Checking for your latest information…':'If this keeps happening, please try again a little later.'}</p>
 </section>;
}
