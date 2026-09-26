import { Bell, BellMinus } from 'lucide-react';
import type { AlertStatus } from '@/features/items/domain';
export function AlertIndicator({ status }: { status: AlertStatus }) {
  if (status === 'off') return null;
  const paused = status === 'paused';
  const label = paused ? 'Alerts paused' : 'Alerts enabled';
  const Icon = paused ? BellMinus : Bell;
  return <span className={'alert-indicator' + (paused ? ' is-paused' : '')} role="img" aria-label={label} title={label}><Icon size={16} strokeWidth={1.8} aria-hidden="true" /><span className="alert-tooltip" aria-hidden="true">{label}</span></span>;
}
