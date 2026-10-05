# Subscription logo sources

Collected on 2026-10-05. Artwork is served locally as transparent 128 × 128 WebP files. Source padding is trimmed before resizing. Simple Icons glyphs use brand colors; white-only Surge and Slimmers World artwork uses a CSS monochrome treatment for contrast. iWant and Cignal Play vector colors are adapted for light reminder cards.

Brand identity comes from the optional `subscription_brand` field selected in the service/gym brand picker. It is independent from the reminder name. Unknown or unselected brands and failed image requests use the category icon. Existing reminders are not assigned a brand from their names.

| Asset | Source |
| --- | --- |
| `anytime-fitness.webp` | https://logotyp.us/file/anytime-fitness.svg |
| `apple-music.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/applemusic.svg |
| `apple-tv.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/appletv.svg |
| `bein-sports.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/BeIN_Sports_logo_(horizontal_version).svg |
| `cignal-play.webp` | https://www.cignalplay.com/assets/images/logo/cignal-logo.svg |
| `crunchyroll.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/crunchyroll.svg |
| `disney-plus.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/Disney%2B_2024.svg |
| `fitness-first.webp` | https://www.fitnessfirst.com/ph/en/-/media/project/evolution-wellness/fitness-first/shared/base/logos/ff-logo-on-light.svg |
| `golds-gym.webp` | https://upload.wikimedia.org/wikipedia/en/3/3f/Gold%27s_Gym_logo.svg |
| `hbo-max.webp` | https://commons.wikimedia.org/wiki/Special:FilePath/HBO_Max_(2025).svg |
| `iqiyi.webp` | https://www.iq.com |
| `iwant.webp` | https://www.iwanttfc.com/iwant_logo.svg |
| `kinetix-lab.webp` | https://kinetixlab.com.ph/wp-content/uploads/2024/09/kinetix-lab-logo-light.svg |
| `netflix.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/netflix.svg |
| `prime-video.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/11.15.0/icons/primevideo.svg |
| `slimmers-world.webp` | https://slimmersworld.com.ph/wp-content/uploads/2018/10/white-swi-logo-1-liner.png |
| `snap-fitness.webp` | https://www.snapfitness.com/ph/images/snap-fitness-logo.svg |
| `spotify.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/spotify.svg |
| `surge.webp` | https://surgefitnesslifestyle.com/wp-content/uploads/2026/04/surge-logo-2x.png |
| `ufc-gym.webp` | https://www.ufcgym.com/images/ufc-gym-logo-black.svg |
| `viu.webp` | https://www.viu.com/ott/1viu-static/assets/logo/logo_icon.svg |
| `viva-one.webp` | https://vivaone.ph/static/image/channel/Logo-vivaone.png |
| `vmx.webp` | https://www.vivamax.net/static/image/channel/Logo-VMX.png |
| `wetv.webp` | https://wetv.vip |
| `youtube-music.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/youtubemusic.svg |
| `youtube-premium.webp` | https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/youtube.svg |

## Validation

- All 26 assets decode as transparent 128 × 128 WebP files; their combined size is 128,520 bytes.
- Local Chrome and Playwright WebKit checks at 1440 px and 390 px covered searchable options, keyboard selection/Escape, empty-search Other, clearing, independent renaming, category changes, demo saving/cancellation, existing sample edits, and image-load fallback. The WebKit preview logged background RSC prefetch access-control warnings. Real Safari/iOS devices and hosted authenticated saving were not tested.
- Build, lint, TypeScript and 14 focused unit tests passed. The updated database harness passed 107 tests against isolated local PostgreSQL, including migration application, brand preservation/clearing, invalid category/brand rejection, ownership, revision conflicts and anonymous/direct-write restrictions.
- The full unit suite had 185 passing tests and one unrelated failure for missing motorcycle artwork (`public/motorcycle-brands/aprilia.webp`) from separate work in progress.
- Public homepage title/canonical/JSON-LD and add/demo noindex/nofollow were checked after the picker change. Previous icon-only homepage Lighthouse scores were SEO 100 and performance 97.

See [subscription-brand-setup.md](subscription-brand-setup.md) for the database deployment steps.
