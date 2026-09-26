# Keeply form refinement plan

Status: proposed; no application changes made for this plan.

## Objective

Make every Keeply field feel consistent, calm, and intentional. Use typography, spacing, proportion, and clear interaction states rather than decorative effects. Preserve existing form behavior, validation, privacy rules, and reward eligibility.

## Findings from the current code

- Global labels use weight 600, and controls inherit their font. This can make entered text, placeholders, and select values look too heavy.
- Several global CSS rules override the same controls. An early light border is replaced later by `#81798e`; focus outlines are also defined more than once.
- Current controls use a 9px radius and 11px/13px padding. The supplied 14px radius and 14px/16px padding would increase both, so do not apply that example literally as a size reduction.
- A legacy search field removes its own outline with `!important`. Its surrounding group needs a visible focus-within state.
- File inputs currently inherit the broad text-field selector, despite needing different proportions and button treatment.
- Feedback combines requirement text, counts, and privacy guidance. Separate these so the form is easier to scan.

## Scope: all application-owned fields

| Surface | Controls included |
| --- | --- |
| Feedback | Type selector, summary, notes, requirement/count/help text, errors and confirmation |
| Item creation/editing | Item name, notes, optional-date controls, all seven template variations |
| Purchase/receipt forms | Product, merchant, category, amount, purchase dates, warranty details, serial number where already supported, notes |
| Important-date forms | Date type/name, expiry and completion dates, last service, repeat interval, reminder offsets, units, checkboxes and preset buttons |
| Item detail and reminder management | Inline edit/completion forms, slot reassignment selectors, reminder controls |
| Lists and search | Search inputs, category/type/status selectors, filter groups and existing search-with-icon treatment |
| Settings | Display name, timezone, email/renewal/analytics preferences, deletion confirmation |
| Documents | Native file chooser, existing upload areas, filename, busy/error/retry states |
| Demo routes | Same styling as the real app; preserve sample behavior and signup boundaries |

Google sign-in and PayMongo hosted fields belong to their providers and are outside this scope. Hidden inputs, action payloads, and billing logic are not styling targets. Existing app-owned form buttons should align with fields without a general button redesign.

## Shared visual specification

### Surfaces and borders

- Use a barely tinted field surface, starting with `#FCFBFE`, against existing panels.
- Use a single 1px neutral border with less purple saturation than the current border.
- Treat `#E4E1EA` as a decorative divider candidate, not an approved field-boundary color. On near-white backgrounds it is too faint to reliably identify an interactive field by itself.
- Pick the final border after checking rendered contrast. Where the boundary identifies the control, target at least 3:1 against adjacent colors. Reduce the heavy feel through normal-weight values and controlled proportions rather than making controls hard to see.
- Start with 12px radius for text controls and textareas. Keep checkboxes and file buttons appropriately shaped; do not round every control identically.
- No gradients, glass effects, inset bevels, or resting shadows on fields.

### Typography and sizing

- Control values: 16px, normal weight (400), explicit line-height around 1.4–1.5. Retain 16px on mobile to avoid introducing automatic zoom behavior.
- Labels: 13–14px, weight 500–600, separated from the value by 8px. Do not allow label weight to inherit into controls.
- Help text: 12–13px, regular weight, readable line-height. Keep meaningful instructions outside placeholders.
- Placeholders: regular weight, muted but readable. Do not adopt `#9995A5` without checking contrast; target 4.5:1 for normal-sized text.
- Standard input/select target height: about 48–52px; compact filters can be 44–48px. Use padding/min-height rather than a rigid height that clips enlarged text or native date controls.
- Textareas: 4–5 rows initially, roughly 128–160px, with vertical resizing. Feedback can expand naturally rather than starting as an oversized empty panel.
- Form rows: consistent 20–24px gaps; label and help spacing should belong to the field group rather than accumulating arbitrary margins.

### Interaction states

| State | Treatment |
| --- | --- |
| Default | Quiet tinted surface, one visible neutral border |
| Hover | Slightly stronger border; no movement or elevation |
| Focus | White surface, existing brand-purple border, soft 3px purple ring plus a clearly visible focus indicator |
| Invalid | Distinct error border and adjacent plain-language message; preserve typed content |
| Disabled/busy | Muted surface and disabled behavior, with readable labels and a clear reason where needed |
| Read-only | Readable value with a subtle surface difference; do not make it look broken or unusable |

Avoid double outlines and rings. Remove existing outlines only when replacing them with an equally visible accessible focus treatment. Respect reduced-motion settings and forced-colors/high-contrast mode. Keep transitions short (about 150ms) and purely decorative.

## Feedback-specific changes

1. Keep “Feedback type” and the existing Problem / Suggestion / General feedback options. Use the same standard select proportions as other forms. Do not replace General feedback with Compliment or favor positive feedback.
2. Keep “Short summary” with a quiet normal-weight placeholder: “What would make Keeply more useful?”
3. Rename the notes label to “Tell us more”. Put the requirement on its own helper line: “Required to receive your one-time reward” or “Optional”, derived from the existing eligibility state.
4. Add persistent concise guidance: “What were you trying to do, and what would have made it easier?” A shorter placeholder can illustrate a concrete suggestion, but must not carry the only instructions.
5. Below the textarea, put the minimum length on the left and the count on the right: “At least 30 characters” / “0 / 2,000”. For ineligible or already-claimed accounts, replace the left text with “Optional”. Wrap gracefully on mobile. Use the same trimmed-character counting as existing validation.
6. Put “Please don’t include passwords, payment details, or ID numbers” on a separate muted line with at most one small decorative lock icon.
7. Keep retention/privacy details separate and readable. Keep the reward explanation and actual expiry visible without turning the reward into the main visual focus of the form.
8. Associate help, requirements, and errors with controls using `aria-describedby`; use `aria-invalid` for field errors where available. Do not announce every keystroke of the character count to screen readers.

Do not change the one-time reward, eight-slot policy, notes minimum/maximum, rate limit, or submission idempotency.

## Control-specific treatment

- **Selects:** retain native selection and keyboard behavior. Style the closed field and reserve space for its indicator. Avoid a custom menu or icons inside every option.
- **Dates:** retain native date inputs, calendar affordances, allowed ranges, and locale behavior. Check iOS/Safari dimensions before reducing padding.
- **Numbers and amounts:** retain native/input-mode behavior and min/max validation; do not hide useful stepper controls solely for appearance. Keep units and currency clearly associated with values.
- **Search:** use one enclosing border/ring around icon and input; remove conflicting inner borders only inside the search component. Keep a visible label or accessible name and the native clear behavior.
- **Checkboxes:** preserve native semantics and brand accent. Keep the mark modest while making the whole associated label row comfortably clickable (target 44px minimum). Do not replace all preferences with switches.
- **Uploads:** exclude file inputs from text-field rules. Style the native `::file-selector-button` and surrounding field deliberately, preserving keyboard access, filename, accept rules, progress, retry, and disabled states. No new drag-and-drop behavior implied by styling.
- **Reminder offset rows:** align number, unit and Remove action; stack on small screens. Keep Remove available and visibly associated with the correct row.
- **Deletion confirmation:** use the shared field styling but retain explicit destructive-action copy, error handling and confirmation requirements.

## Implementation approach

1. Capture representative desktop/mobile baselines for feedback, item creation, date editing, settings, filters, and uploads.
2. Read the relevant installed Next.js guides before editing code, as required by AGENTS.md.
3. Consolidate existing control styles into one documented section in `src/app/globals.css`, using shared field tokens for surface, border, focus, radius, and spacing. Remove conflicting legacy overrides rather than appending another overriding layer.
4. Explicitly target supported text-like inputs, select, and textarea. Exclude checkbox, radio, file, hidden, and button inputs. Use separate rules for file and checkbox controls.
5. Apply the typography and states globally to application-owned controls. Use small contextual classes for compact filters, search wrappers, and upload controls rather than duplicating a style per page.
6. Adjust feedback markup for label/help/count/privacy hierarchy, preserving all form data and submission logic.
7. Fix field-group spacing and accessibility associations in the inventoried forms where needed. Keep this a presentation change, not a rewrite of state management.
8. Review responsive renders and edge states, then run validation below. Leave provider dashboards and deployment actions to the user's existing workflow.

Primary files: `src/app/globals.css`; the form/list/detail components listed in the scope inventory; feedback presentation in `src/components/feedback-form.tsx`. No schema migration or new dependency is expected.

## Acceptance checks

- All controls have consistent normal-weight values and readable labels, help and placeholders.
- A focused field is unmistakable by keyboard and pointer without a neon glow or multiple outlines.
- Standard fields are compact and comfortable; text does not clip at 200% zoom.
- Check 375px, 390px, 768px and desktop widths, including long timezone names, filenames, summaries, and translated/native date formatting.
- Feedback displays the required and optional variants correctly; empty, short, maximum-length, pending, failure, and success states remain usable.
- Keyboard navigation works through selects, checkboxes, date fields, uploads, offset removal and submit actions. Required/error text is associated with its field.
- Verify normal-text contrast (4.5:1), control/focus contrast where applicable (3:1), and high-contrast/reduced-motion behavior.
- Verify item save/edit, date completion, reminders, filters, settings, uploads and demo flows retain their behavior. Do not send test feedback to production or consume a real reward for visual QA.
- Run lint and the production build/TypeScript check. Run relevant existing tests if markup or validation associations change; avoid tests that merely assert CSS strings. Database tests are unnecessary unless scope expands into data behavior.
- Compare screenshots for consistency, not for an unsupported claim that conversion increased.

## Out of scope

New field animations, floating labels, custom date pickers or select libraries, icons in every field, global page redesign, pricing/slot changes, backend changes, provider-controlled checkout/sign-in fields, and paid design tools.

## Rollout

Implement and review this as one focused form-polish change after the feedback feature's migration/deployment status is established. No new environment variables are required. Publish a short manual verification checklist with the implementation and let the user handle production deployment as requested.
