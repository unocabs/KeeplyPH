import styles from '@/components/app-recovery.module.css';

export default function CheckupLoading() {
 return <div className={styles.loading} role="status" aria-live="polite">
   <h1>Getting your checkup ready</h1>
   <p>We’re bringing your saved expenses together. Your next step will appear here shortly.</p>
   <div className={styles.placeholder} aria-hidden="true"/>
 </div>;
}
