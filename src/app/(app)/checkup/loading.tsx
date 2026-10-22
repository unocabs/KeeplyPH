import styles from '@/components/app-recovery.module.css';

export default function CheckupLoading() {
 return <div className={styles.loading} role="status" aria-live="polite">
   <h1>Getting your checkup ready</h1>
   <p>We’re still loading your saved expenses, so the totals and timeline aren’t ready to show yet. You can stay here while they load.</p>
   <div className={styles.placeholder} aria-hidden="true"/>
 </div>;
}
