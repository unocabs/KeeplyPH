# Homepage feature-section design plan

Date: 26 October 2026. Status: approved by the owner and implemented locally. Not deployed.

## Scope and evidence

Improve the three sections in the owner's homepage screenshot: recurring payments, car registration and Premium planning. Keep bills, home maintenance and purchases/warranties ahead of these supporting sections. Keep the existing hero, category order and useful public guide links.

The owner asks for better UI and permits realistic, simple photography. The screenshot, live homepage and repository show three similarly styled, full-width white panels with long text and competing alignments. The loan example uses October 15, 2026 as a next payment even though the review date is October 26. These are owner direction and interface observations, not measured customer demand.

The research baseline, sections 2.1 through 2.3 and 12, supports testing reduced interpretation, clear next actions and household-focused positioning. It does not establish that this particular layout or photography will improve conversion or comprehension.

## Recommended layout

On desktop, place the recurring-payment and car-registration cards side by side in a two-column grid. Give each a shallow photo, short heading, one brief paragraph and a clear action. Follow with one wider Premium section containing copy on the left and a compact preview of the real sample planner on the right.

On mobile, stack payments, registration and Premium in that order. Put each photo above its copy and let the Premium sample preview follow its introduction. Keep all text readable without truncation or horizontal scrolling. Do not force matched heights by clipping copy.

Use consistent left alignment, 24 to 32 px interior spacing on desktop, 20 to 24 px on mobile, and restrained rounded corners around 20 px. Use an approximately 24 px gap between the two cards and more space before the Premium section. Keep paragraphs at a comfortable reading width rather than stretching across the entire homepage. Use subtle borders and minimal shadows. Give each card one clear main action; the loan guide remains a quieter secondary text link.

## Proposed content and actions

### Recurring payments

Heading: **Keep recurring payments organised.**

Copy: Keep loan payment dates, amounts and payment history together. Set a repeat schedule that matches your provider's dates.

Main action: **Add a loan reminder**, retaining `/add/other?preset=personal-loan`.

Secondary link: **Explore loan payments**, retaining `/loan-payment-reminder`.

Remove the long list of loan types and the dated inline example from this homepage section. Keep the detailed loan explanation available in the existing guide. Remove the trailing paragraph listing other categories already covered by the homepage directory. Amount entry remains optional in the actual editor; do not label an entered sample amount as optional or unconfirmed.

### Car registration

Heading: **Know when your car registration is due.**

Copy: Check your plate-based renewal window, prepare the requirements and save the date you confirm.

Action: **Check my renewal schedule**, retaining `/lto-registration-renewal#renewal-calculator`.

Keep the distinction between a standard plate-based window and a confirmed deadline. Do not imply that Keeply completes an LTO transaction.

### Premium planning

Heading: **A clearer view of the months ahead.**

Copy: See upcoming household dates and costs together, up to a year ahead.

Action: **Explore a sample account**, retaining `/demo/planner?days=365`.

Keep the existing offer and its conditions together in quieter supporting copy: Install Keeply and open it while signed in for 30 days of Premium. No card required. Verify the offer against the current entitlement implementation before release; this proposal does not change Free or Premium access.

Use a compact read-only preview derived from the actual sample planner data, labelled **Sample household**. Preserve real item names, provider or brand artwork and useful icon fallbacks wherever individual records appear. Use the shared identity components. Show estimates as estimates and missing amounts explicitly, with no confirmation categories. Route the action to the complete existing sample experience. Do not present an AI-generated interface image or make the preview look interactive unless its controls work.

## Photography

Use two restrained photographs with the same warm daylight, cream surface and muted lavender accents. Keep text and actions outside the photographs.

1. **Recurring payments:** reuse `public/images/bills/bills-desk.webp` as the first candidate. It already depicts the folder-and-paperwork style the owner likes. Check the crop before committing to reuse. Generate a new photograph only if the existing composition does not fit: one lavender folder, a few generic payment sheets and a pencil, with no readable financial details or lender branding.
2. **Car registration:** reuse `public/images/lto/registration-paperwork.webp`, created for the LTO guide. Keep the car key and paperwork visible in desktop and mobile crops.
3. **Premium:** use the real sample planner preview rather than another desk photograph. This explains the paid benefit while avoiding a third repetitive still life.

Use responsive WebP images with explicit dimensions, useful alt text and reserved space. Keep these lower-page images lazy-loaded. Aim for small source assets, approximately the existing 60 to 100 KB photographs, then assess actual responsive transfer sizes and visual quality. No portraits, stock office scenes, invented bank logos, readable receipts, decorative photo text or extra promotional badges.

## Implementation sequence

1. Agree the section arrangement, proposed copy and photo crops.
2. Build the two-card row and the wider Premium section using the existing destinations and sample-data helpers. Preserve homepage IDs used by links.
3. Reuse the two existing photographs first. Generate a replacement payment photograph only if necessary after crop review.
4. Verify destinations and complete existing add, calculator and sample journeys, including returning after sign-in where relevant. Recheck Premium offer eligibility against the current implementation.
5. Check Chrome and WebKit at desktop and narrow mobile widths, including 320 px, keyboard navigation, focus states, contrast, enlarged text, image failure and reduced motion.
6. Preserve title, description, canonical URL, language/locale, indexing rules, sitemap and WebSite/WebApplication/Organization/WebPage structured data. Verify rendered output and affected structured data. Run mobile and desktop Lighthouse before release and report remaining limitations.

## Expected result and validation

Expected result: visitors can distinguish the three purposes and choose an action with less reading. The photos add warmth; the actual sample preview makes the planning benefit concrete.

Validate whether people can locate loan organisation, reach the registration calculator and explain what Premium adds without reading every paragraph. Confirm that they understand the Premium preview is fictional sample data and that its installation offer has conditions. Compare task completion and misunderstandings with the current layout before claiming an improvement. No customer study or new photography was performed.

## Implementation and validation

The owner approved implementation on 26 October. The homepage now uses a server-rendered supporting-sections component with two photo cards and a wider Premium preview. Both existing photographs are reused with responsive lazy loading and reserved space. The three-month preview and next payments use the same sample projection and Outlook calculation helpers as the real sample planner. Shared item identity components preserve provider/brand logos and icon fallbacks. The dated loan example and long supporting paragraphs were removed. Existing destinations and the loan section ID remain intact.

Build, lint and 40 existing planning/Premium/Outlook unit tests passed. Local production browser checks passed in Chrome at 1280px, 768px, 390px and 320px, and WebKit at 390px. They checked image loading, side-by-side/stacked layouts, all preview totals against the sample planner, artwork, keyboard navigation, the loan's preserved login destination, sample-form cancellation, the loan guide, calculator invalid/valid input and reminder date, and sample amount cancellation, errors and successful updates. Both browser engines passed doubled-text checks at 320px and photo/logo failure checks at 390px. Logo failures retained recognisable product/category artwork, visible names and usable actions.

The title, description, canonical URL, language/locale and WebSite/WebApplication/Organization/WebPage graph were preserved and checked in rendered output. Sitemap and robots checks passed. Lighthouse scored 100 for all weighted desktop categories; mobile scored 91 performance and 100 accessibility, best practices and SEO. Both runs recorded zero layout shift. The existing shared-brand accessible-name experimental finding remains; these scores are not a comprehensive accessibility certification. See the [validation record](../../artifacts/home-supporting-sections/validation.json) and [desktop preview](../../artifacts/home-supporting-sections/desktop.png).

These checks used a local production build and browser emulation. Physical devices, household comprehension, external Google OAuth, hosted saves and installed-app gift activation were not tested. The existing gift contract was checked in source for authenticated, installed, one-time 720-hour eligibility; no entitlement code changed. No hosted deployment was performed.
