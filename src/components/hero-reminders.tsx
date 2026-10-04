import Image from 'next/image';
import { Bell, Droplets, GraduationCap, HeartPulse, House, IdCard, ReceiptText, ShieldCheck, Smartphone, Wifi, Wrench, Zap } from 'lucide-react';
import styles from './hero-reminders.module.css';

// Decorative examples only: these brands do not indicate connected integrations.
const reminders = [
  { name: 'toyota', image: '/car-brands/toyota.webp' },
  { name: 'netflix', image: '/hero/netflix.svg' },
  { name: 'electricity', icon: Zap },
  { name: 'water', icon: Droplets },
  { name: 'insurance', icon: ShieldCheck },
  { name: 'documents', icon: IdCard },
  { name: 'youtube', image: '/hero/youtube.svg' },
  { name: 'honda', image: '/car-brands/honda.webp' },
  { name: 'disney', image: '/hero/disney-plus.webp' },
  { name: 'loan', image: '/hero/home-credit.svg' },
  { name: 'internet', icon: Wifi },
  { name: 'maintenance', icon: Wrench },
  { name: 'warranty', icon: ReceiptText },
  { name: 'health', icon: HeartPulse },
  { name: 'education', icon: GraduationCap },
  { name: 'mobile', icon: Smartphone },
  { name: 'home', icon: House },
  { name: 'custom', icon: Bell },
];

export function HeroReminders({ variant = 'landing' }: { variant?: 'landing' | 'dashboard' }) {
  return <div className={`${styles.scene}${variant === 'dashboard' ? ` ${styles.dashboard}` : ''}`} aria-hidden="true">
    {reminders.map(({ name, image, icon: Icon }) => <span key={name} className={`${styles.reminder} ${styles[name]}`}>
      <span className={styles.float}>
        {image ? <Image src={image} alt="" width={128} height={128} unoptimized draggable={false} /> : Icon && <Icon strokeWidth={1.65} />}
      </span>
    </span>)}
  </div>;
}
