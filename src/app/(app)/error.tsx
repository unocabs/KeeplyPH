'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="empty-state"><h2>We couldn’t load that right now.</h2><p>Your saved information hasn’t changed. Please try again.</p><button className="button primary" onClick={reset}>Try again</button></div>; }
