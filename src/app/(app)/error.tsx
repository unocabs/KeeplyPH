'use client';
export default function ErrorPage({ retry }: { retry: () => void }) { return <div className="empty-state"><h2>We couldn’t load that right now.</h2><p>Your saved information hasn’t changed. Please try again.</p><button className="button primary" onClick={retry}>Try again</button></div>; }
