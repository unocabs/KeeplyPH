import { ImageResponse } from 'next/og';

export const alt = 'Keeply PH — Your important things, remembered.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(120deg, #fafaff, #e9e3ff)', color: '#282738', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 18, background: '#6351cf', color: 'white', fontSize: 40 }}>k</div>
        <div style={{ fontSize: 42, fontWeight: 700 }}>keeply.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.12, maxWidth: 950 }}>Your important things, remembered.</div>
        <div style={{ fontSize: 28, color: '#625c78' }}>Receipts. Renewals. Important dates. A little peace of mind.</div>
      </div>
      <div style={{ fontSize: 24, color: '#6351cf' }}>www.keeplyph.com</div>
    </div>,
    size,
  );
}
