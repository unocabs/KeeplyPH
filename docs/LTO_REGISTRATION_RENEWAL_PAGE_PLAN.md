# LTO registration renewal page plan

Status: planning only; page implementation has not started.
Research date: September 30, 2026.

## Purpose and scope

Help Philippine private-car owners understand registration renewal, prepare for the appropriate route, and save a confirmed renewal reminder in Keeply. Cover vehicle registration rather than driver's license renewal. Explain that distinction near the top.

- URL: `/lto-registration-renewal`
- Exact title: `LTO Car Registration Renewal: Requirements & Steps | Keeply PH`
- H1: `LTO car registration renewal: requirements and steps`
- Proposed description: `Prepare for LTO car registration renewal with a requirements checklist, plate-based schedule, online and walk-in steps, and a renewal reminder from Keeply PH.`
- Primary action: `Set my renewal reminder` → `/add/car?focus=registration`
- Secondary action: `Open the official LTMS portal` → https://portal.lto.gov.ph/
- Public guide readable without signing in; sign-in happens only when saving a reminder.

## Research evidence and limits

The linked 2025 motor-vehicle Citizen's Charter returned HTTP 403 on direct access. Its indexed renewal sections were readable, including printed pages 205, 208 and 210. Indexed text was compared with the 2025 external-services charter, the 2024 charter, the LTO NCR renewal page, and LTO schedule material. This is a sourced planning draft, not a claim that the full PDF or all subsequent circulars were reviewed.

The NCR page contains an older-looking flat checklist and sticker-release step. Prefer the more specific 2025 renewal material when they differ. Do not import the sticker step or old processing-time promises into the new guide.

Before publication, check for superseding issuances and resolve the verification items below. The eventual public review date must reflect that completed review; do not automatically set it to the deployment date.

## Page layout and content

### 1. Opening answer and navigation

Use a compact introduction explaining who this guide serves, followed by a jump menu: Requirements, Schedule, Steps, Costs, Special cases, Questions, Sources.

Include a short disclosure: `Keeply PH is an independent reminder app. Renewal transactions are completed through LTO.` Show the actual source-review date beside the introduction once the review is complete.

Give readers the answer before presenting the product. Keep one unobtrusive reminder action near the introduction and a stronger action after the practical guidance.

### 2. Requirements: show conditions, not one universal shopping list

Present a mobile-friendly table with columns for item, when it applies, and where it comes from. Expand acronyms on first use. The following is the concise factual basis from the 2025 checklist:

- OR/CR photocopy: initial renewal in MVIRS only; not applicable to online renewal.
- Insurance: electronically authenticated Certificate of Cover from an accredited insurer; a separate GSIS provision applies to government vehicles.
- Inspection: electronically transmitted PMVIC MVISR, or an original LTO MVIR for the applicable walk-in route.
- The MVIR route includes electronically transmitted CEC for vehicles not inspected at PMVICs, excluding electric vehicles; this route is not applicable online.
- Online renewal lists a previous LTMS renewal transaction as a condition.

Source: [2025 LTO motor-vehicle Citizen's Charter](https://lto.gov.ph/wp-content/uploads/2025/11/MV-CC-2025.pdf), renewal checklist, beginning at printed page 205. [2024 charter](https://lto.gov.ph/wp-content/uploads/2024/05/LTO_CC_05-30-2024.pdf), printed page 151, corroborates the conditional inspection structure.

Editorial treatment: keep the conditions visible. Do not imply every applicant must purchase both inspection routes. Explain the distinction between documents to keep handy and documents formally required for a particular transaction.

### 3. When to renew: month and week tables

Show the standard schedule from LTO's driver education material:

| Last plate digit | Registration month |
| --- | --- |
| 1 | January |
| 2 | February |
| 3 | March |
| 4 | April |
| 5 | May |
| 6 | June |
| 7 | July |
| 8 | August |
| 9 | September |
| 0 | October |

| Second-to-last plate digit | Working-day window within that month |
| --- | --- |
| 1, 2, 3 | 1st–7th |
| 4, 5, 6 | 8th–14th |
| 7, 8 | 15th–21st |
| 9, 0 | 22nd–last day |

Source: [LTO Filipino Driver's Manual, volume 2, second edition](https://lto.gov.ph/wp-content/uploads/2023/10/FDM-vol.-2-2nd-Edition.pdf), printed page 17. [LTO general information material](https://www.lto.gov.ph/wp-content/uploads/2023/09/RO105-CDE-General-Information-10.22.pdf) also illustrates the schedule.

Illustration: a plate ending in `24` corresponds to April's first working-day window under this standard table. Label this as an illustration, not an individualized deadline.

Add a visible instruction to confirm the applicable year and deadline from the vehicle record and current LTO advisories. Resolve initial-registration validity, special plates, holidays and extensions before making categorical claims. Version one will show tables, not calculate or save an inferred due date.

### 4. How to renew: two numbered paths

For eligible online applicants, summarize the charter flow: log into LTMS, validate requirements, select payment, save confirmation, pay, and receive the OR by email. Online processing does not mean inspection is performed online.

Source: [2025 charter](https://lto.gov.ph/wp-content/uploads/2025/11/MV-CC-2025.pdf), printed page 208.

For walk-in applicants, explain document preparation, submission/evaluation, assessed payment and receipt collection. LTO NCR lists submission of requirements followed by payment and receipt issuance. [LTO NCR renewal page](https://www.ltoncr.com/renewal-of-motor-vehicle-mv-registration/).

Before implementation, verify the latest individual walk-in sequence and LTMS account/vehicle-linking prerequisites. Keep the guide at a stable process level rather than reproducing unverified portal button labels. Do not promise completion within a particular number of minutes.

### 5. What renewal costs

Explain cost components in a table; avoid a universal total. The 2025 charter lists a ₱10 Legal Research Fund charge and formula-based fees; private-car MVUC depends on gross vehicle weight and model year. Its fee block also mentions category-specific charges.

Source: [2025 charter](https://lto.gov.ph/wp-content/uploads/2025/11/MV-CC-2025.pdf), printed page 208.

Plan separate rows for LTO-assessed fees, insurance, inspection/emissions for the chosen route, and any applicable payment-channel charge. Verify current pricing sources before adding amounts beyond the sourced charter item. Clearly distinguish provider prices from government fees. A penalty calculator and estimated all-in total are outside version one.

### 6. Situations needing extra checks

Use short expandable notes. LTO NCR identifies additional documentation for tax-exempt vehicles, special-economic-zone vehicles, for-hire vehicles, stolen/recovered vehicles and reactivation from storage. For example, stored vehicles require the Receipt of Return Plate and Licenses; recovered vehicles have recovery/alarm documentation requirements. [LTO NCR renewal page](https://www.ltoncr.com/renewal-of-motor-vehicle-mv-registration/).

These notes should direct readers to the relevant official instructions rather than imply the private-car checklist covers every case. For expired registration, a new car's first renewal, missing plates or changed ownership, include only verified guidance. If verification remains incomplete, direct readers to LTO for their vehicle-specific assessment without quoting guessed rules or penalties.

### 7. Questions and reminder action

Answer these questions using the preceding material, without duplicating whole sections:

- What documents do I need for LTO car registration renewal?
- How do I find my registration month and week?
- Can I renew through LTMS?
- Do I need both PMVIC inspection and separate emissions testing?
- How much should I budget?
- Is car registration renewal the same as driver's license renewal?
- Can Keeply renew my registration?

End with `Know your renewal date? Save a reminder.` Explain that the user enters a confirmed date and chooses email alerts. Link to the existing vehicle reminder page for product details. Do not imply LTO integration, automatic deadline verification or renewal processing.

## Implementation plan

1. Finish factual review and write the final copy with citations beside the relevant sections.
2. Read the applicable installed Next.js guides before writing code, as required by AGENTS.md.
3. Add `src/app/lto-registration-renewal/page.tsx` using existing public-page styling, brand and navigation.
4. Set the exact title explicitly so the root title template does not append a second brand suffix. Add the canonical URL and matching social metadata.
5. Add the route to the sitemap. Link it from the homepage and vehicle reminder page; link back to the product page from the guide. Keep the guide's information purpose distinct from the product page.
6. Reuse the existing registration-focused add flow and verify that it survives sign-in.
7. If page measurement is included, update both the client page allowlist and server validation after inspecting the current metrics implementation. Preserve the existing privacy model.
8. Consider Article and BreadcrumbList structured data only when it matches visible content and truthful dates/authorship. No invented credentials or promised rich results.
9. Check mobile tables, keyboard navigation, headings, contrast, source links, public access, metadata and sitemap inclusion. Run the relevant existing build/check commands.

## Publication checks

- Resolve current eligibility, inspection-route details and any newer LTO issuances.
- Verify current fee applicability; omit unverified prices and penalty formulas.
- Distinguish baseline schedule from vehicle-specific exceptions.
- Confirm the individual walk-in process; do not reuse stale sticker-release instructions.
- Set an honest review date and retain a source list with document years/page references.
- Main guide remains usable without an account and without JavaScript-only content.
- Keeply claims match the actual reminder product.
- Review the content quarterly and when relevant LTO guidance changes; this is an editorial recommendation, not a scheduled automation.

## Version-one boundaries

One useful, sourced guide with a reminder conversion path. No full-plate collection, automatic deadline calculator, license-renewal guide, fee calculator, account access to LTMS, or payment processing. Those would require separate product and factual work.
