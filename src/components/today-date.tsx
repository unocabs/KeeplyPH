'use client';

import { useSyncExternalStore } from 'react';
import { todayIn } from '@/lib/domain';

function subscribeToToday(refresh: () => void) {
  const timer = window.setInterval(refresh, 60_000);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
  };
}
const todaySnapshot = () => todayIn('Asia/Manila');
const serverTodaySnapshot = () => '';
const dateFormat = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export function TodayDate() {
  const today = useSyncExternalStore(subscribeToToday, todaySnapshot, serverTodaySnapshot);
  const label = today ? dateFormat.format(new Date(`${today}T12:00:00+08:00`)) : '';
  return <time className="brand-today" dateTime={today || undefined} aria-label={label ? `Today is ${label}` : undefined}>{label}</time>;
}
