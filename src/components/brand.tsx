import Link from 'next/link';
import Image from 'next/image';
import { TodayDate } from './today-date';
export function Brand({ href = '/' }: { href?: string }) {
  return <span className="brand-lockup"><Link href={href} className="brand" aria-label="KeeplyPH.com home"><Image className="brand-logo" src="/brand/keeply-logo.png" width={64} height={64} alt="" priority /><span>KeeplyPH<span className="brand-dot">.com</span></span></Link><TodayDate /></span>;
}
