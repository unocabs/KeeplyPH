import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { isSignedIn } from '@/lib/auth';

export async function PublicAuthLink() {
  const signedIn = await isSignedIn();
  return <Link className="button secondary" href={signedIn ? '/dashboard' : '/login'}>
    <span>{signedIn ? 'Open app' : 'Sign in'}</span><ArrowRight size={15} aria-hidden="true" />
  </Link>;
}
