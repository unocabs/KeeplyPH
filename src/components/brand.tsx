import Link from 'next/link';
import Image from 'next/image';
import { TodayDate } from './today-date';
export function Brand({ href = '/', showAppType = false }: { href?: string; showAppType?: boolean }) {
  const wordmark = <>Keeply</>;
  return <span className={'brand-lockup' + (showAppType ? ' brand-lockup-described' : '')}>
    <Link href={href} className="brand" aria-label="Keeply home">
      <Image className="brand-logo" src="/brand/keeply-logo.png" width={64} height={64} alt="" priority />
      {showAppType ? <span className="brand-copy"><span>{wordmark}</span><span className="brand-app-type">Household Admin App</span></span> : <span>{wordmark}</span>}
    </Link>
    <TodayDate />
  </span>;
}
