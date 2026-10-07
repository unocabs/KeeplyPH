import type { ReactNode } from 'react';

export type IconModifier = 'insurance' | 'maintenance' | 'payment' | 'warranty' | 'renewal' | 'registration' | 'verified' | 'medical' | 'school' | 'plus' | 'clock' | 'electric' | 'water' | 'wifi' | 'professional';
export type IconName = 'sparkles' | 'car' | 'motorcycle' | 'house' | 'shield' | 'shield-heart' | 'shield-medical' | 'shield-check' | 'document' | 'wallet' | 'receipt' | 'calendar' | 'id' | 'passport' | 'stethoscope' | 'school' | 'book' | 'appliance' | 'aircon' | 'cloud' | 'card' | 'building' | 'bank' | 'laptop' | 'shirt' | 'plane' | 'briefcase' | 'repeat' | 'play' | 'dumbbell' | 'badge' | 'wrench' | 'bug' | 'heart' | 'tooth' | 'syringe' | 'cap' | 'checklist' | 'accessibility' | 'hand-coins' | 'phone' | 'envelope';
export interface IconSpec { icon: IconName; modifier?: IconModifier }

// Secondary planes share the primary hue. No gradients, filters, masks or IDs:
// the same SVG can be repeated in server output and small calendar cells.
function Tone({ children }: { children: ReactNode }) {
  return <g fill="var(--icon-secondary, currentColor)" fillOpacity=".18" stroke="none">{children}</g>;
}

function ShieldShape() {
  return <><Tone><path d="m12 2.7 8 3v6.1c0 4.7-5.1 8.4-8 9.5-2.9-1.1-8-4.8-8-9.5V5.7Z" /></Tone><path d="m12 2.7 8 3v6.1c0 4.7-5.1 8.4-8 9.5-2.9-1.1-8-4.8-8-9.5V5.7Z" /></>;
}

function DocumentShape() {
  return <><Tone><path d="M5 3h10l4 4v4H5Z" /></Tone><path d="M15 3H6a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V7.5L15 3Z" /><path d="M14.5 3v5h5M8 12h7M8 16h5" /></>;
}

function BaseShape({ icon, omitDetail = false }: { icon: IconName; omitDetail?: boolean }) {
  switch (icon) {
    case 'car': return <><Tone><path d="m4.5 10 2-5.5h11l2 5.5Z" /></Tone><path d="m4.5 10 2-5.5h11l2 5.5M4 10h16a2 2 0 0 1 2 2v6H2v-6a2 2 0 0 1 2-2Z" /><path d="M3 18v3h3v-3m12 0v3h3v-3M5 13h2m10 0h2" /></>;
    case 'motorcycle': return <><Tone><path d="M7 11h7l-3 5H5Z" /></Tone><circle cx="5" cy="17" r="3.3" /><circle cx="19" cy="17" r="3.3" /><path d="m19 17-4-11h-3m4 3h3M5 17l4-6h5l-3 6H5m2-6H4m5 0 2 6h4" /></>;
    case 'house': return <><Tone><path d="M5 10h14v10H5Z" /></Tone><path d="m2.5 10 9.5-7.5 9.5 7.5M5 8.5V21h14V8.5M9.5 21v-7h5v7" /></>;
    case 'shield': return <ShieldShape />;
    case 'shield-heart': return <><ShieldShape /><path d="m12 15-3.4-3.5A2.2 2.2 0 0 1 12 8.7a2.2 2.2 0 0 1 3.4 2.8Z" /></>;
    case 'shield-medical': return <><ShieldShape /><path d="M12 8v7m-3.5-3.5h7" /></>;
    case 'shield-check': return <><ShieldShape /><path d="m8.5 11.5 2.3 2.5 4.8-5" /></>;
    case 'document': return <DocumentShape />;
    case 'wallet': return <><Tone><rect x="3" y="7" width="18" height="13" rx="2" /></Tone><path d="M19 7V4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16V7H5a2 2 0 0 1 0-4" /><path d="M21 11h-5a2 2 0 0 0 0 4h5" /><path d="M16.5 13h.2" /></>;
    case 'receipt': return <><Tone><path d="M5 3h14v7H5Z" /></Tone><path d="m5 3 2 1.5L9 3l3 1.5L15 3l2 1.5L19 3v18l-2-1.5-2 1.5-3-1.5L9 21l-2-1.5L5 21Z" />{!omitDetail && <path d="M8 8h8M8 12h8m-8 4h5" />}</>;
    case 'calendar': return <><Tone><rect x="3" y="5" width="18" height="6" rx="2" /></Tone><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" />{!omitDetail && <path d="M7 15h3m-3 3h3m4-3h3" />}</>;
    case 'id': return <><Tone><rect x="3" y="6" width="8" height="13" rx="2" /></Tone><rect x="2.5" y="5.5" width="19" height="14" rx="2" /><circle cx="7.5" cy="10.5" r="2" /><path d="M4.5 16v-.5a3 3 0 0 1 6 0v.5M14 10h4m-4 5h3" /></>;
    case 'passport': return <><Tone><rect x="5" y="3" width="15" height="18" rx="2" /></Tone><rect x="5" y="3" width="15" height="18" rx="2" /><path d="M5 5H3v15m6-2h7" /><circle cx="12.5" cy="10" r="4" /><path d="M8.5 10h8m-4-4c2 2 2 6 0 8-2-2-2-6 0-8Z" /></>;
    case 'stethoscope': return <><Tone><circle cx="18" cy="11" r="3" /></Tone><path d="M4 3v6a5 5 0 0 0 10 0V3M3 3h3m6 0h3M9 14v2a5 5 0 0 0 10 0v-2" /><circle cx="18" cy="11" r="3" /></>;
    case 'school': return <><Tone><path d="M8 8h8v13H8Z" /></Tone><path d="m6 8 6-5 6 5M8 7v14h8V7M8 10H3v11h18V10h-5M10 21v-5h4v5m-2-11v1" /></>;
    case 'book': return <><Tone><path d="M3 4c4-1 7-.2 9 1v15c-3-1.5-6-2-9-1Z" /></Tone><path d="M12 5c-3-1.5-6-2-9-1v15c3-1 6-.5 9 1 3-1.5 6-2 9-1V4c-3-1-6-.5-9 1Zm0 0v15" /></>;
    case 'appliance': return <><Tone><circle cx="12" cy="14" r="4.5" /></Tone><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 8h16M7 5.5h2" /><circle cx="12" cy="14" r="4.5" /></>;
    case 'aircon': return <><Tone><rect x="2.5" y="3" width="19" height="10" rx="2" /></Tone><rect x="2.5" y="3" width="19" height="10" rx="2" /><path d="M3 10h18m-5-4h2M7 16v2c0 2-2 2-2 2m7-4v5m5-5v2c0 2 2 2 2 2" /></>;
    case 'cloud': return <><Tone><path d="M7 19h10a5 5 0 0 0 0-10h-.5C15.5 3 6 3 5.5 10 1 10 1 19 7 19Z" /></Tone><path d="M7 19h10a5 5 0 0 0 0-10h-.5C15.5 3 6 3 5.5 10 1 10 1 19 7 19Z" /></>;
    case 'card': return <><Tone><path d="M3 8h18v5H3Z" /></Tone><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18m-14 7h4" /></>;
    case 'building': return <><Tone><rect x="9" y="3" width="12" height="18" rx="1" /></Tone><path d="M9 21V3h12v18H3V9h6m4 12v-4h4v4M13 7h.1m4 0h.1M13 11h.1m4 0h.1M6 13v1m0 3v1" /></>;
    case 'bank': return <><Tone><path d="m3 8 9-5 9 5Z" /></Tone><path d="m3 8 9-5 9 5H3Zm2 4v6m7-6v6m7-6v6M3 21h18" /></>;
    case 'laptop': return <><Tone><rect x="4" y="4" width="16" height="12" rx="1.5" /></Tone><rect x="4" y="4" width="16" height="12" rx="1.5" /><path d="m4 16-2 4h20l-2-4M9 20h6" /></>;
    case 'shirt': return <><Tone><path d="M7 4c2 3 8 3 10 0l4 4-3 4-2-2v11H8V10l-2 2-3-4Z" /></Tone><path d="M7 4c2 3 8 3 10 0l4 4-3 4-2-2v11H8V10l-2 2-3-4Z" /></>;
    case 'plane': return <><Tone><path d="m21 3-7 8 1 7-3 2-3-7-5-2-1-3 8 1 7-7Z" /></Tone><path d="m21 3-7 8 1 7-3 2-3-7-5-2-1-3 8 1 7-7ZM5 16l-2 4 4-2" /></>;
    case 'briefcase': return <><Tone><rect x="3" y="8" width="18" height="13" rx="2" /></Tone><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M8 8V4h8v4M3 12l9 4 9-4m-9 2v3" /></>;
    case 'repeat': return <><Tone><path d="m19 5-3-3v6Zm-14 14 3-3v6Z" /></Tone><path d="M4 10V5h15l-3-3m3 3-3 3m4 6v5H5l3 3m-3-3 3-3" /></>;
    case 'sparkles': return <><Tone><path d="m10 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /></Tone><path d="m10 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm9-3 1 2 2 1-2 1-1 2-1-2-2-1 2-1Zm0 15 .7 1.3 1.3.7-1.3.7-.7 1.3-.7-1.3-1.3-.7 1.3-.7Z" /></>;
    case 'play': return <><Tone><circle cx="12" cy="12" r="9" /></Tone><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4Z" /></>;
    case 'dumbbell': return <><Tone><rect x="4" y="5" width="4" height="14" rx="1" /><rect x="16" y="5" width="4" height="14" rx="1" /></Tone><rect x="4" y="5" width="4" height="14" rx="1" /><rect x="16" y="5" width="4" height="14" rx="1" /><path d="M8 12h8M2 9v6m20-6v6" /></>;
    case 'badge': return <><Tone><path d="m12 2 3 2 4 .5 1 4 2 3.5-2 3.5-1 4-4 .5-3 2-3-2-4-.5-1-4L2 12l2-3.5 1-4L9 4Z" /></Tone><path d="m12 2 3 2 4 .5 1 4 2 3.5-2 3.5-1 4-4 .5-3 2-3-2-4-.5-1-4L2 12l2-3.5 1-4L9 4Z" /><path d="m8 12 3 3 5-6" /></>;
    case 'wrench': return <><Tone><path d="M14 3a6 6 0 0 0-7 8L3 17a2.5 2.5 0 0 0 4 4l6-6a6 6 0 0 0 8-7l-4 4-4-4Z" /></Tone><path d="M14 3a6 6 0 0 0-7 8L3 17a2.5 2.5 0 0 0 4 4l6-6a6 6 0 0 0 8-7l-4 4-4-4Z" /></>;
    case 'bug': return <><Tone><rect x="7" y="7" width="10" height="14" rx="5" /></Tone><rect x="7" y="7" width="10" height="14" rx="5" /><path d="M9 7V4h6v3m-6-3L7 2m8 2 2-2M7 10H3m4 5H2m5 3-3 3m13-11h4m-4 5h5m-5 3 3 3M12 8v12" /></>;
    case 'heart': return <><Tone><path d="M12 21 3.5 12A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 8.5 7Z" /></Tone><path d="M12 21 3.5 12A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 8.5 7Z" /><path d="M5 12h3l2-4 3 8 2-4h4" /></>;
    case 'tooth': return <><Tone><path d="M12 4C9 2 6 2 4.5 5c-2 4 2 8 2 12 0 2 1 4 2.5 4s1-6 3-6 1.5 6 3 6 2.5-2 2.5-4c0-4 4-8 2-12C18 2 15 2 12 4Z" /></Tone><path d="M12 4C9 2 6 2 4.5 5c-2 4 2 8 2 12 0 2 1 4 2.5 4s1-6 3-6 1.5 6 3 6 2.5-2 2.5-4c0-4 4-8 2-12C18 2 15 2 12 4Zm-3-.8c2 1 3 2 5 2" /></>;
    case 'syringe': return <><Tone><path d="m7 13 7-7 4 4-7 7Z" /></Tone><path d="m7 13 7-7 4 4-7 7ZM5 15l4 4m-2-2-4 4M13 5l6 6m-3-3 3-3m-2-2 4 4m-11 6 2 2" /></>;
    case 'cap': return <><Tone><path d="m2 8 10-5 10 5-10 5Z" /></Tone><path d="m2 8 10-5 10 5-10 5ZM6 10v7c4 3 8 3 12 0v-7m4-2v8" /></>;
    case 'checklist': return <><Tone><rect x="8" y="2.5" width="8" height="5" rx="1" /></Tone><path d="M8 5H5v16h14V5h-3" /><rect x="8" y="2.5" width="8" height="5" rx="1" /><path d="m8 11 1 1 2-2m2 1h3m-8 6 1 1 2-2m2 1h3" /></>;
    case 'accessibility': return <><Tone><circle cx="12" cy="4" r="2" /><path d="m8 9 4 1 4-1-2 5 3 7H7l3-7Z" /></Tone><circle cx="12" cy="4" r="2" /><path d="m4 8 8 2 8-2m-8 2v4m0 0-5 7m5-7 5 7" /></>;
    case 'hand-coins': return <><Tone><circle cx="16" cy="6" r="3.5" /><path d="m3 16 4-4h7l2 3 4-2 2 2-7 6H7Z" /></Tone><circle cx="16" cy="6" r="3.5" /><path d="m2 16 4-4h7a2 2 0 0 1 0 4h-3m5 0 4-3a2 2 0 0 1 3 2l-7 6H7l-5-5m14-12v4" /></>;
    case 'phone': return <><Tone><rect x="6" y="3" width="12" height="18" rx="2" /></Tone><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 6h4m-3 12h2" /></>;
    case 'envelope': return <><Tone><rect x="3" y="5" width="18" height="15" rx="2" /></Tone><rect x="3" y="5" width="18" height="15" rx="2" /><path d="m3 6 9 7 9-7" /></>;
  }
}

function ModifierShape({ modifier }: { modifier: IconModifier }) {
  switch (modifier) {
    case 'insurance': return <path d="m0-3 2.5 1v2c0 1.6-1.5 2.8-2.5 3.3C-1 2.8-2.5 1.6-2.5 0v-2Z" />;
    case 'maintenance': return <path d="M.4-2.8A2.2 2.2 0 0 0-2-.1L-3 1.4a1 1 0 0 0 1.6 1.6L.1 2a2.2 2.2 0 0 0 2.7-2.4L1.3 1.1-.9-1.1Z" />;
    case 'payment': return <path d="M-1.3 2.7v-5.4H.4a1.7 1.7 0 0 1 0 3.4h-1.7M-2.3-1.2h4.6" />;
    case 'warranty':
    case 'verified': return <path d="m-2.4-.1 1.6 1.7 3.2-3.4" />;
    case 'renewal': return <path d="M2.4-.9A2.5 2.5 0 1 0 2 1.5m.4-4v1.8H.6" />;
    case 'registration': return <><rect x="-2" y="-2.6" width="4" height="5.2" rx=".6" /><path d="M-1-1h2m-2 2h2" /></>;
    case 'professional': return <path d="m0-2.8.9 1.7 1.9.3-1.4 1.4.3 1.9L0 1.6l-1.7.9.3-1.9-1.4-1.4 1.9-.3Z" />;
    case 'medical':
    case 'plus': return <path d="M0-2.5v5m-2.5-2.5h5" />;
    case 'school': return <><path d="m-3-.8 3-1.7 3 1.7L0 .9Zm1 1v2c1.3 1 2.7 1 4 0v-2" /></>;
    case 'clock': return <><circle r="2.5" /><path d="M0-1.5V0l1 1" /></>;
    case 'electric': return <path d="m.5-3-3 3.5H0L-.5 3l3-3.5H0Z" />;
    case 'water': return <path d="M0-3c-1 1.5-2.2 2.8-2.2 4A2.2 2.2 0 0 0 2.2 1C2.2-.2 1-1.5 0-3Z" />;
    case 'wifi': return <path d="M-2.6-1.3a4 4 0 0 1 5.2 0m-4.2 1.6a2 2 0 0 1 3.2 0M0 2h.01" />;
  }
}

/** Use open interior space for a cue; reserve corner composition for distinct object + purpose pairs. */
export function CategoryGlyph({ icon, modifier, size = 22 }: IconSpec & { size?: number }) {
  const inset = (icon === 'receipt' && (modifier === 'electric' || modifier === 'water' || modifier === 'wifi'))
    || (icon === 'calendar' && (modifier === 'plus' || modifier === 'medical' || modifier === 'clock'));
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-icon={icon} data-modifier={modifier}>
    <g transform={modifier && !inset ? 'scale(.9)' : undefined}><BaseShape icon={icon} omitDetail={inset} /></g>
    {modifier && (inset
      ? <g transform="translate(12 15) scale(1.25)" strokeWidth={1.44}><ModifierShape modifier={modifier} /></g>
      : <g transform="translate(18.5 18.5)" strokeWidth={1.5}><circle r="3.7" fill="var(--icon-surface, white)" stroke={modifier === 'payment' || modifier === 'warranty' || modifier === 'verified' ? 'currentColor' : 'none'} /><ModifierShape modifier={modifier} /></g>)}
  </svg>;
}
