import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
export function Brand({ href = '/' }: { href?: string }) {
  return <Link href={href} className="brand" aria-label="Keeply home"><span className="brand-mark"><ReceiptText size={22} strokeWidth={2} /></span><span>keeply<span className="brand-dot">.</span></span></Link>;
}
