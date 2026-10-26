"use client";
import { useEffect, useRef, useState } from 'react';
import { parseReactionTotals, type Reaction, type ReactionTotals } from '@/lib/public-reactions';
import styles from './page.module.css';

const choices = [
  { value: 'helpful', emoji: '👍', label: 'Helpful' },
  { value: 'easy', emoji: '😊', label: 'Easy to use' },
  { value: 'love', emoji: '❤️', label: 'Love it' },
] as const;
const storageKey = 'keeply:lto-reaction';
const numberFormat = new Intl.NumberFormat('en-PH');
export function CalculatorReactions() {
  const [available, setAvailable] = useState(false);
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [totals, setTotals] = useState<ReactionTotals | null>(null);
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const receipt = useRef<string | null>(null);
  const sending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let active = true;
    void fetch('/api/reactions', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active) return;
        setAvailable(data?.available === true);
        setTotals(parseReactionTotals(data?.totals));
      })
      .catch(() => { if (active) { setAvailable(false); setTotals(null); } })
      .finally(() => {
        clearTimeout(timeout);
        if (!active) return;
        setSupported(typeof crypto.randomUUID === 'function');
        try {
          const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (stored && choices.some(choice => choice.value === stored.reaction)) {
            if (stored.saved === true) { setSelected(stored.reaction); setSaved(true); }
            else if (typeof stored.id === 'string' && /^[0-9a-f-]{36}$/i.test(stored.id)) {
              receipt.current = stored.id; setSelected(stored.reaction);
            }
          }
        } catch { /* Storage may be unavailable; the current visit still works. */ }
        setLoading(false);
      });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [refresh]);
  async function submit(reaction: Reaction) {
    if (sending.current || saved || !available || !supported || loading) return;
    sending.current = true; setPending(true); setError('');
    // Reuse the same receipt after a timeout, including after a reload.
    const choice = selected || reaction;
    setSelected(choice);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      receipt.current ||= crypto.randomUUID();
      try { localStorage.setItem(storageKey, JSON.stringify({ id: receipt.current, reaction: choice, saved: false })); } catch {}
      const response = await fetch('/api/reactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: receipt.current, reaction: choice }), signal: controller.signal,
      });
      if (!response.ok) throw new Error('SAVE_FAILED');
      const data = await response.json();
      if (data.saved !== true) throw new Error('SAVE_FAILED');
      setTotals(parseReactionTotals(data.totals));
      setSaved(true);
      try { localStorage.setItem(storageKey, JSON.stringify({ reaction: choice, saved: true })); } catch {}
    } catch { setError('We couldn’t save your reaction. Please try again.'); }
    finally { clearTimeout(timeout); sending.current = false; setPending(false); }
  }
  return <section className={styles.reactions} aria-labelledby="calculator-feedback-heading" aria-busy={loading || pending}>
    <h3 id="calculator-feedback-heading">Was this helpful?</h3>
    <div className={styles.reactionChoices}>
      {choices.map(choice => <button key={choice.value} type="button" className={styles.reactionButton}
        aria-pressed={selected === choice.value} disabled={loading || !available || !supported || pending || saved || (selected !== null && selected !== choice.value)}
        onClick={() => void submit(choice.value)}>
        <span className={styles.reactionEmoji} aria-hidden="true">{choice.emoji}</span>{choice.label}
        {totals && <span className={styles.reactionCount}>{numberFormat.format(totals[choice.value])}<span className="sr-only"> {totals[choice.value] === 1 ? 'vote' : 'votes'}</span></span>}
      </button>)}
    </div>
    <p className={styles.reactionTotal} role="status">{totals ? `${numberFormat.format(totals.total)} ${totals.total === 1 ? 'vote' : 'votes'} in total` : loading ? 'Loading votes…' : 'Vote counts are temporarily unavailable.'}</p>
    <p className={styles.reactionStatus} role="status">{saved ? 'Thanks for your feedback!' : pending ? 'Saving your reaction…' : loading ? 'Optional · No sign-in needed' : !supported ? 'Voting is unavailable in this browser.' : !available ? 'Voting is temporarily unavailable. Please try again.' : 'Optional · No sign-in needed'}</p>
    {!loading && (!available || !totals) && <button className="text-button" type="button" disabled={pending} onClick={() => { setLoading(true); setRefresh(value => value + 1); }}>Refresh votes</button>}
    {error && <div><p className={styles.error} role="alert">{error}</p><button className="text-button" type="button" disabled={pending} onClick={() => selected && void submit(selected)}>Retry saving reaction</button></div>}
  </section>;
}
