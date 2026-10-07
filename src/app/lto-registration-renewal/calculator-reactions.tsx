"use client";
import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';

const choices = [
  { value: 'helpful', emoji: '👍', label: 'Helpful' },
  { value: 'easy', emoji: '😊', label: 'Easy to use' },
  { value: 'love', emoji: '❤️', label: 'Love it' },
] as const;
type Reaction = typeof choices[number]['value'];
const storageKey = 'keeply:lto-reaction';
export function CalculatorReactions() {
  const [available, setAvailable] = useState(false);
  const [selected, setSelected] = useState<Reaction | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const receipt = useRef<string | null>(null);
  const sending = useRef(false);
  useEffect(() => {
    if (typeof crypto.randomUUID !== 'function' || typeof AbortSignal.timeout !== 'function') return;
    const controller = new AbortController();
    void fetch('/api/reactions', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (controller.signal.aborted || data?.available !== true) return;
        try {
          const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (stored && choices.some(choice => choice.value === stored.reaction)) {
            if (stored.saved === true) { setSelected(stored.reaction); setSaved(true); }
            else if (typeof stored.id === 'string' && /^[0-9a-f-]{36}$/i.test(stored.id)) {
              receipt.current = stored.id; setSelected(stored.reaction);
            }
          }
        } catch { /* Storage may be unavailable; the current visit still works. */ }
        setAvailable(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  async function submit(reaction: Reaction) {
    if (sending.current || saved) return;
    sending.current = true; setPending(true); setError('');
    // Reuse the same receipt after a timeout, including after a reload.
    const choice = selected || reaction;
    setSelected(choice);
    try {
      receipt.current ||= crypto.randomUUID();
      try { localStorage.setItem(storageKey, JSON.stringify({ id: receipt.current, reaction: choice, saved: false })); } catch {}
      const response = await fetch('/api/reactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: receipt.current, reaction: choice }), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok || (await response.json()).saved !== true) throw new Error('SAVE_FAILED');
      setSaved(true);
      try { localStorage.setItem(storageKey, JSON.stringify({ reaction: choice, saved: true })); } catch {}
    } catch { setError('We couldn’t save your reaction. Please try again.'); }
    finally { sending.current = false; setPending(false); }
  }
  if (!available) return null;
  return <div className={styles.reactions} aria-label="Calculator feedback">
    <h3>Was this helpful?</h3>
    <div className={styles.reactionChoices}>
      {choices.map(choice => <button key={choice.value} type="button" className={styles.reactionButton}
        aria-pressed={selected === choice.value} disabled={pending || saved || (selected !== null && selected !== choice.value)}
        onClick={() => void submit(choice.value)}>
        <span aria-hidden="true">{choice.emoji}</span>{choice.label}
      </button>)}
    </div>
    <p className={styles.reactionStatus} role="status">{saved ? 'Thanks for your feedback!' : pending ? 'Saving your reaction…' : 'Optional · No sign-in needed'}</p>
    {error && <div><p className={styles.error} role="alert">{error}</p><button className="text-button" type="button" disabled={pending} onClick={() => selected && void submit(selected)}>Retry saving reaction</button></div>}
  </div>;
}
