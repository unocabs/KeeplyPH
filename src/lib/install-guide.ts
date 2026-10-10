export type InstallDevice = 'ios' | 'android' | 'computer';
export interface InstallStep { title: string; text: string; hint?: string; image?: string; alt?: string }
export function installedApp(): boolean {
  return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
export function subscribeInstalledApp(update: () => void) {
  const modes = [matchMedia('(display-mode: standalone)'), matchMedia('(display-mode: minimal-ui)')];
  modes.forEach(mode => mode.addEventListener('change', update));
  window.addEventListener('focus', update);
  return () => {
    modes.forEach(mode => mode.removeEventListener('change', update));
    window.removeEventListener('focus', update);
  };
}
export const installSteps: Record<InstallDevice, InstallStep[]> = {
  ios: [
    { title: 'Open Keeply and tap Share', text: 'On your iPhone or iPad, open keeplyph.com in Safari and sign in. Tap Share: the square with an arrow pointing up.', image: '/guides/install/ios-share.webp', alt: 'Share icon circled in red in the top-right browser toolbar.', hint: 'The toolbar may be at the top or bottom. If Share is hidden, open the browser’s page menu.' },
    { title: 'Find the installation options', text: 'If you see View More, tap its downward arrow. Otherwise, scroll down through the Share sheet.', image: '/guides/install/ios-view-more.webp', alt: 'View More button circled in red; suggested contacts and reminder details are blurred.' },
    { title: 'Tap Add to Home Screen', text: 'Look for the plus inside a rounded square beside Add to Home Screen, then tap that row.', image: '/guides/install/ios-home-screen.webp', alt: 'Add to Home Screen menu row circled in red.' },
    { title: 'Keep Open as Web App on', text: 'If Open as Web App appears, leave its switch green. Tap Add in the top-right corner.', image: '/guides/install/ios-confirm.webp', alt: 'The green Open as Web App switch and the Add button circled in red.' },
    { title: 'Open the new Keeply icon', text: 'Go to your Home Screen and tap Keeply. Sign in to the same account if asked. Your 30-day Premium gift activates automatically. No card or payment details are needed.', image: '/guides/install/ios-launch.webp', alt: 'Keeply Home Screen icon circled in red with the personal wallpaper blurred.', hint: 'Already installed? Open that icon now. The screenshots show one iPhone interface; your menu layout may differ.' },
  ],
  android: [
    { title: 'Open Keeply in Chrome', text: 'On your Android phone or tablet, open keeplyph.com in Chrome and sign in. If you opened Keeply inside another app, open it in Chrome first.' },
    { title: 'Open the three-dot menu', text: 'Tap the three vertical dots (⋮), usually at the top-right corner of Chrome.', hint: 'These are text instructions. Menu placement and labels can vary by browser and Android version.' },
    { title: 'Install Keeply', text: 'Tap Add to Home screen or Install app. If Chrome offers a choice, choose Install rather than creating a basic shortcut. Confirm by tapping Install or Add.', hint: 'If the option is missing, update Chrome and open Keeply directly in a regular Chrome tab. A shortcut that opens a normal browser tab may not qualify as an installed app.' },
    { title: 'Open Keeply from its icon', text: 'Find Keeply on your Home Screen or in your app list and tap it. Sign in to the same account if asked. Your 30-day Premium gift activates automatically. No card or payment details are needed.' },
  ],
  computer: [
    { title: 'Open Keeply on your computer', text: 'Open keeplyph.com in Chrome or Edge and sign in. On a Mac with macOS Sonoma or later, Safari’s Add to Dock is another option.' },
    { title: 'Install Keeply as an app', text: 'In Chrome or Edge, look for the install icon in the address bar, or open the browser menu and look for Install Keeply or Apps → Install this site as an app. On supported Macs using Safari, choose File → Add to Dock, then Add.', hint: 'Menu names differ by browser version. For these steps, use Chrome or Edge, or Safari on a supported Mac.' },
    { title: 'Launch the installed app', text: 'Open Keeply from your desktop, Start menu, app launcher, or Mac Dock. Sign in to the same account. Your 30-day Premium gift activates automatically, without payment details.' },
  ],
};
