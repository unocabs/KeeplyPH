import Link from 'next/link';
export default function NotFound() { return <main className="auth-page" id="main-content"><div className="auth-card"><div className="eyebrow">NOT FOUND</div><h1>Nothing kept here.</h1><p>This page or purchase isn’t available.</p><Link href="/dashboard" className="button primary">Back to my purchases</Link></div></main>; }
