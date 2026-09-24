import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function DeletedPage() { return <main className="auth-page" id="main"><section className="auth-card"><Brand /><h1>Deletion requested.</h1><p>Your account access has been removed. Your files and account will be cleaned up by our scheduled process.</p><Link href="/" className="button secondary wide">Back to Keeply</Link></section></main>; }
