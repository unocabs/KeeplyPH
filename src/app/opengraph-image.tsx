import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Keeply PH — All your reminders. One easy place. Bills, warranties and ID dates, with optional alerts.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const logo = await readFile(join(process.cwd(), 'public/brand/keeply-logo.png'), 'base64');
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: 64, background: 'linear-gradient(125deg, #faf9ff, #ece6ff)', color: '#29233e', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: 675 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 38 }}><span style={{ fontSize: 40, fontWeight: 700 }}>keeply.</span><span style={{ fontSize: 18, color: '#7054cb', border: '1px solid #d7cbee', borderRadius: 10, padding: '5px 12px' }}>PH</span></div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.08, letterSpacing: -3 }}>All your reminders. One easy place.</div>
        <div style={{ fontSize: 25, lineHeight: 1.5, color: '#70677f', marginTop: 25 }}>Bills. Warranties. IDs. Passports.</div>
        <div style={{ fontSize: 25, lineHeight: 1.5, color: '#70677f' }}>Your reminders, with alerts you choose.</div>
        <div style={{ fontSize: 20, color: '#6746cb', marginTop: 38 }}>www.keeplyph.com</div>
      </div>
      {/* ImageResponse renders an embedded asset directly, without the browser image optimizer. */}
      <img src={'data:image/png;base64,' + logo} width={400} height={400} alt="" style={{ borderRadius: 48 }} />
    </div>, size,
  );
}
