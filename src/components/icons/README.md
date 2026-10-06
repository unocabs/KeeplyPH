# Keeply category icons

`CategoryGlyph` owns the local SVG geometry. `icon-specs.ts` assigns base objects
and semantic modifiers to categories, templates, purchase types, presets and date
purposes. `ReminderIcon` retains provider artwork and its existing fallbacks.

- Use a 24 × 24 canvas, rounded caps/joins and a 1.8px primary stroke.
- Keep artwork and its stroke inside the canvas; aim for an 18–21px optical size.
- Add one secondary plane with `Tone`, using the category hue at 18% opacity.
- Reuse base objects for repeated concepts. Corner modifiers sit at (18.5, 18.5) and use
  a 7.4px backing plane; composed bases scale to 90% to leave room for the cue.
- Keep modifiers simple enough to read at the normal 22px glyph size. Avoid
  nested outlines; labels always carry the full meaning.
- A modifier must clarify the item, not merely repeat its category or label.
  General purchase and bill choices do not need warranty/payment decorations.
- Put a semantic cue inside an open base when possible: utility symbols replace
  receipt text, and appointment symbols replace calendar day marks. Inset cues
  keep the full base size and use the same effective 1.8px stroke.
- Use one restrained secondary plane. Do not fill every available part of an
  object, add ornamental badges, or keep details that merge at actual UI size.
- Avoid SVG IDs, filters, gradients, external references and runtime icon packs.
- Decorative SVGs use `aria-hidden` and `focusable="false"`. The surrounding
  control owns its accessible name.

Category surface tokens live in `globals.css`: `--icon-primary`,
`--icon-secondary`, `--icon-surface`, `--icon-highlight` and `--icon-border`.
Tiles are 42px on desktop and 40px on mobile. Bare inline glyphs inherit
`currentColor`, so status and filter controls retain their own color treatment.

Vehicle picker choices pass `focus` to distinguish service, insurance and
registration. This changes artwork only; category keys and navigation remain in
the existing template catalog. Add new presets to the exhaustive `presetIcons`
record and review them at desktop, mobile and small inline sizes.
