import Link from 'next/link';
import Image from 'next/image';
export function Brand({ href = '/' }: { href?: string }) {
  return <Link href={href} className="brand" aria-label="Keeply PH home"><Image className="brand-logo" src="/brand/keeply-logo.png" width={64} height={64} alt="" priority /><span>keeply<span className="brand-dot">.</span><small className="brand-country">PH</small></span></Link>;
}
