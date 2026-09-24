# Keeply PH — product, UX, architecture and SEO plan

Planning date: 21 September 2026. Status: **proposal for approval; no application changes authorised by this document.**

Updated 23 September 2026 with homepage, dashboard, template-picker and readability feedback. These refinements preserve the existing visual identity and agreed V1 scope.

This expands the existing receipt/warranty concept. The local receipt MVP already exists, but this document does not claim the expanded product exists. Keep that work as the baseline and migrate it incrementally only after approval.

Retain the previously selected Google sign-in through Supabase Auth, Supabase PostgreSQL with RLS, private Supabase Storage, Next.js/TypeScript, supabase-js and supabase/ssr, Resend, PayMongo, and Vercel Hobby starting configuration.

## 1. Refined product positioning

**Keeply — Your important things, remembered.**

Supporting explanation: “Keep your receipts and documents together, and get a reminder before important dates.”

The proposition is retrieval plus timely action: find the receipt, know the date, remember the next step. Avoid promising that Keeply guarantees a renewal, validates a government document, or prevents every missed deadline.

Use Keeply as the interface wordmark and Keeply PH where market identification helps, including search titles and the organisation description. Retain keeplyph.com.

Visual direction: restrained colour, clear typography, generous spacing, ordinary product icons, strong accessible contrast, and real interface examples. Philippine relevance belongs in OR/CR, aircon, PMS, peso formatting, date defaults, and source-backed guidance. No flag palette, maps, jeepneys, sun/star decoration, tourism imagery, forced Taglish, or decorative “Pinoy” identity.

**Challenge:** broad positioning is useful; a broad launch is not. Win three situations first: a purchase you may need to claim against, a renewal you must remember, and maintenance you want to repeat.

## 2. Core user problems

| Moment | Desired outcome | Product response |
|---|---|---|
| Something breaks | Find receipt and coverage quickly | Purchase page with documents, store, dates and serial number |
| A renewal approaches | Know early enough to act | Upcoming dates and explicit email opt-in |
| Someone asks for a document | Retrieve the right file | Search and one clear download action |
| Maintenance was done months ago | Know what happened and what is next | Last-completed history and next due date |
| Information lives across screenshots and drawers | Keep one useful reference | Optional attachments; never require a complete dossier |

Success is not time spent in the app. A quick successful retrieval can be more valuable than daily engagement.

## 3. Philippine consumer behaviour and use cases

Treat fragmented receipts, screenshots, household maintenance needs, and email reach as **interview hypotheses**, not measured behaviour of all Filipino consumers. Recruit owners of appliances, car/motorcycle owners, and people managing their own renewals. Ask about the last actual missed date or document search rather than hypothetical enthusiasm.

Verified context and product implications:

| Topic | Evidence and limits | Product decision |
|---|---|---|
| Vehicle registration | LTO publishes plate-based scheduling guidance. It is not enough to establish every vehicle's current deadline or temporary extension. | V1 records a user-confirmed date/window from current documents; no automatic plate calculator |
| Driver's licence | LTO documentation distinguishes five-year and qualifying ten-year validity | Ask for printed expiry; never infer a new expiry from age or last renewal |
| Passport | The 2024 implementing rules describe regular adult/minor validity and possible exceptions | Use the printed expiry; 12/6/3 calendar-month nudges are product defaults, not travel eligibility rules |
| National ID | PSA guidance says Filipino citizens' National IDs do not expire | No mandatory expiry; default to document organisation without reminders |
| PRC PIC | PRC provides a renewal workflow and eligibility requirements | Later template uses the printed date and official links, not a CPD eligibility engine |
| UMID/MySSS | SSS currently describes MySSS Card and replacement options for older cards | Do not conflate legacy UMID, bank-card expiry, benefit eligibility, or newer cards; no universal inferred expiry |

Sources: [LTO registration guidance](https://lto.gov.ph/wp-content/uploads/2023/10/FDM-vol.-2-2nd-Edition.pdf), [LTO licence validity](https://lto.gov.ph/wp-content/uploads/2023/09/IRR-RA10930.pdf), [passport implementing rules](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/99268), [PSA National ID guidance](https://rsso03.psa.gov.ph/sites/default/files/2026-03/2025-Annual-Report-PSO-Nueva-Ecija_.pdf), [PRC renewal workflow](https://www.prc.gov.ph/sites/default/files/PRC_CC_03312025.pdf), [SSS MySSS Card](https://www.sss.gov.ph/mysss-card/).

This research did not establish a complete current exception catalogue for LTO deadlines or every ID variant. Those are deliberately not automated. Never substitute a historical memorandum or a search-result snippet for a current operational rule.

## 4. MVP scope

Include personal Google accounts; specific add flows; saved items with zero or more documents and dates; upcoming/overdue views; name/type/date search; reminder opt-in; simple completion/renewal history; private uploads; account/file deletion; usage limits; annual Premium; and a small public marketing/content surface.

Proposed limits: Free has 10 saved items, 3 active dates with reminders, and 100 MB of documents. Premium has 1,000 saved items, up to 1,000 active reminder dates, and 2 GB. Both allow 6 files per item, 10 MB per file, up to 10 dates per item, and up to 3 offsets per date. These are abuse/cost ceilings, not reserved provider capacity.

An active reminder is **one unfinished date with its selected nudges**, not one item or one email. A car with registration, insurance and service reminders consumes three slots. Describe that clearly before opt-in. Past expiry remains visible; do not send unbounded overdue email.

For quota purposes, count only opted-in, unarchived dates with an open occurrence due today or later in the account timezone. Past dates without future nudges, completed dates without a next occurrence, and document-only items consume no active-reminder slot. Enabling a renewed occurrence rechecks the quota atomically.

No full identity numbers are needed. Recommend Passport and Driver's Licence V1 flows store labels and dates, without scans. Optional receipt, warranty and vehicle files remain supported but require the privacy controls below; OR/CR can also contain sensitive information.

## 5. Templates to launch with

Scores are product judgments, not market research: 1 low to 5 high. Frequency refers to relevant activity, ease means easier implementation, return means likelihood of a useful later visit.

| Rank | Template | Usefulness | Frequency | Urgency | Ease | Return | Launch |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | Receipt & Warranty, including appliances | 5 | 4 | 4 | 5 | 4 | V1 |
| 2 | Motorcycle | 4 | 4 | 5 | 3 | 5 | V1 |
| 3 | Car | 4 | 4 | 5 | 3 | 5 | V1 |
| 4 | Aircon maintenance | 4 | 4 | 3 | 4 | 5 | V1 |
| 5 | Driver's Licence | 4 | 1 | 5 | 5 | 2 | V1, dates only |
| 6 | Passport | 3 | 1 | 5 | 5 | 2 | V1, dates only |
| 7 | Insurance | 4 | 2 | 5 | 4 | 4 | As a vehicle date first |
| 8 | Water-filter replacement | 3 | 4 | 3 | 4 | 4 | Later preset |
| 9 | PRC ID | 3 | 2 | 5 | 4 | 3 | V1.1 |
| 10 | Rental/lease | 3 | 2 | 4 | 3 | 3 | Later |
| 11 | Pet vaccination | 3 | 3 | 5 | 2 | 4 | Later; vet-entered dates |
| 12 | National ID / UMID | 3 | 1 | 2 | 3 | 2 | Later document-only presets |
| 13 | Pest control | 2 | 3 | 3 | 4 | 3 | Later |

**Exact V1 picker:** Receipt & Warranty; Car; Motorcycle; Driver's Licence; Passport; Aircon Maintenance; Other Important Date. The final option is a constrained fallback, not a configurable form builder.

Car and Motorcycle share one implementation with different labels/examples. Appliances are a purchase category and entry shortcut, not another domain object. Seven visible choices therefore need only five form families: purchase, vehicle, expiring document, maintenance, and simple date.

## 6. Templates to postpone

Postpone standalone insurance, PRC, National ID/UMID scans, general document vaults, medical/health records, pet clinical schedules, lease workflows, and every household maintenance variant.

Reasons differ: low repeat use, sensitive scans, specialised correctness requirements, or redundant forms. Allow a user-supplied date through Other when useful, but do not advertise specialised capabilities that are not implemented.

Do not infer vaccination dates, policy coverage, licence eligibility, or legally sufficient documents.

## 7. UX principles

Name the task: “Add your car”, “Save a receipt”, “When does it expire?” Use My items, Saved items, Documents and Settings where needed. Conversational “things” is welcome in marketing; never expose internal names such as Thing, Entity, Record, Rule or Object as interface concepts.

Preserve the current quiet lavender design, spacing and reassuring tone. Keep “A little heads-up”, “Everything in its place.” and “Little things, safely kept.” where they fit. “One less thing to remember.” can support save confirmation. Use precise Expired, Overdue and Due today labels alongside the friendly headings so the tone never obscures status.

Mobile navigation: Home, My items, a prominent Add action, Settings. Upcoming is the first dashboard section rather than a separate task-management product.

Progressively disclose optional detail. Require only a helpful label for purchases/vehicles; require a date only when the user chooses to track one. Use “Add later” and “No expiry date” as distinct choices.

Show an unchecked “Email me before this date” choice with preselected timing underneath. One explicit opt-in accepts the timings; defaults must not silently opt the user in. “Change” reveals offsets, not cron terminology or reminder names.

Use 44–48 px touch targets, readable 16 px input text, keyboard support, labels, visible focus and text status alongside colour. Avoid birthday collection, identity numbers, licence numbers, full plates or manufacturer details unless they serve an immediate user need.

Audit pale grey/purple secondary copy, merchant/location metadata, placeholders and pricing text against their actual backgrounds. Require at least 4.5:1 for normal text, 3:1 for qualifying large text, and 3:1 for visual information needed to identify controls and states against adjacent colours. Darken existing tokens where needed and check bright outdoor phone readability. These are acceptance targets, not a claim the current interface has passed. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

### Dashboard evolution

Keep the current layout while replacing purchase-only summary language:

| Card | Definition | Supporting text / action |
|---|---|---|
| Saved items | All retained items, including archived items while they consume storage/quota | “8 of 10 free items”; opens My items with archived items discoverable |
| Active reminders | Active reminder dates under section 4, not emails or item count | “3 dates with email reminders”; opens those dates |
| Coming up | Open dates on unarchived items due today through 30 calendar days from today, inclusive, in the account timezone, whether or not email is enabled | “Next 30 days”; opens the matching date list |

“A little heads-up” shows upcoming dates in chronological order, each with an item label, date kind, exact date and relative time. A vehicle can appear more than once when it has different dates. Separate overdue/expired dates visibly; do not include them in Coming up. Show up to five upcoming rows, separating dates beyond the 30-day horizon under “Later”, with a link to view all dates. An empty state can offer “Add an important date”; never imply email is enabled just because a date appears here.

Illustrative rows, using synthetic data:

| Item | Date kind | Relative time |
|---|---|---|
| Sony WH-1000XM5 | Warranty | 11 days remaining |
| Toyota Vios | Registration | 27 days remaining |
| Passport | Expiration | 8 months remaining — Later |
| Driver's Licence | Expiration | 1 year remaining — Later |

“Everything in its place.” introduces the saved-item collection beneath the date view. Keep receipt retrieval prominent; a purchase without a reminder is still useful.

## 8. Homepage information architecture

1. Header: Keeply, How it works, Pricing, Sign in.
2. Hero: **Your important things, remembered.** Supporting copy with receipts, warranties, vehicle renewals and document expiry. Primary “Start for free”; secondary “See an example”.
3. Recognition grid: **“What should Keeply remember for you?”** Group supported tasks into the categories below, followed by **“See everything Keeply can track →”** linking to a compact on-page catalogue of the seven live templates.
4. Concrete sample: car registration approaching; washing-machine receipt ready to find; aircon last cleaned. Use synthetic data clearly marked Example.
5. Three-step explanation: choose what matters, add a date or document, choose reminders.
6. Trust explanation: who can access files, what is optional, how deletion works; never unsupported “bank-level” or end-to-end encryption claims.
7. Free/Premium summary: **“Keep up to 10 things for free. No credit card required.”** Show the 3 active reminder dates and 100 MB limits nearby, then practical FAQs.
8. Footer: help, privacy, terms, contact and a few relevant guides.

Do not show every possible template or a giant software feature checklist. Visitors can understand the product and use a public example without logging in.

| Homepage category | V1 explanation and destination |
|---|---|
| Receipts & warranties | /warranty-tracker; receipt retrieval plus optional warranty dates |
| Vehicle documents | /vehicle-registration-reminder; offer both Car and Motorcycle, never silently choose Car |
| IDs & licences | /document-expiry-tracker#drivers-licence; clearly state dates-only Driver's Licence support |
| Passports | /document-expiry-tracker#passport; dates-only expiry reminders |
| Vehicle insurance | Vehicle page insurance section; add an insurance date to a vehicle |
| Home & appliances | On-page choice of appliance receipt/warranty or Aircon Maintenance |

Category labels are navigation, not additional templates. Use “Vehicle insurance” until standalone policies are supported; do not imply a general ID vault. Broader “Insurance” and additional ID choices belong to later releases. All fragment targets must exist, and category links should lead to relevant explanations while direct add actions retain the selected intent.

## 9. Onboarding flow

Default homepage CTA opens the template picker. A focused SEO CTA skips it and opens the matching introduction: “Track your motorcycle registration”.

The prominent purple + opens **“What do you want to keep?”**, with an accessible “Add item” label, the exact seven V1 choices and short concrete examples. Preserve keyboard focus when opening/closing the picker. Templates supply relevant fields and proposed timings; users should never construct a generic record or reminder rule. “Warranty” and “Home / Appliance” shortcuts reuse Receipt & Warranty with the relevant section/category selected, rather than creating duplicate templates or items. “Something else” may be the friendly label for Other Important Date, with “A name and a date” as its explanation.

Before login, show an example and the minimal fields required. Ask for Google sign-in before accepting private values or uploading documents. Preserve only an allowlisted template key and safe source-page identifier across OAuth; do not put names, plate numbers, document dates or file contents in URLs/cookies.

After OAuth, return to the exact add flow, never a generic empty dashboard. Do not ask a second round of profile questions. Default locale en-PH, timezone Asia/Manila, currency PHP; let Settings override timezone.

After first save: show the result and next reminder date, then one contextual suggestion such as “Add your insurance renewal”. No forced tour, import prompt, referral prompt or Premium modal.

## 10. Add-item flows

| Flow | Minimum | Optional details | Reminder proposal |
|---|---|---|---|
| Receipt & Warranty | Product label | Receipt/photo; merchant; purchase date/price; category; serial number | Warranty date: 30/7/1 days |
| Car / Motorcycle | Nickname, e.g. “My Vios” | OR/CR, insurance file, receipt, last plate digits | Registration/insurance: 30/7/1 days, adjustable |
| Driver's Licence | Printed expiry; prefilled label | Friendly label | 90/30/7 days; product choice, not renewal eligibility advice |
| Passport | Printed expiry; prefilled label | Friendly label | 12/6/3 calendar months |
| Aircon Maintenance | Label and next service date, or last service plus chosen interval | Service receipt, cost, notes | 7/1 days |
| Other Important Date | Label and date | Notes | 30/7/1 days, adjustable |

Purchase: photo/file → name → optional “Has a warranty?” → start/duration or expiry → opt-in → save. Allow save without a file.

Vehicle: nickname → choose Registration, Insurance or Service → enter/confirm relevant date → opt-in → save. Add other dates afterwards; never display a ten-field questionnaire by default. Full plate number is optional; manual-date V1 does not need it.

Maintenance: offer 3/6/12-month interval buttons and Custom, with no preselected universal cleaning frequency. The user's technician/manufacturer recommendation determines the interval. Show the resulting next date before saving.

Completion: “Mark done” asks completion date, then “Next date” with a suggestion only where appropriate. For service, calculate from actual completion by default; allow keeping the original schedule. For licences/passports/insurance, ask for the newly issued date rather than assuming the next validity period. For registration, suggest a year only as an editable planning date requiring confirmation.

Handle no date, unknown date, upcoming, due today, expired, overdue maintenance, completed and archived separately. An expired passport is not a completed renewal. A stored ID without expiry is not overdue.

Creation drafts expire after 24 hours; show upload progress, processing, retry and remove. On connection loss retain the form during the session and expose resumable server drafts after authentication. Clear sensitive temporary browser data on sign-out; do not add persistent offline document storage in V1.

## 11. Generic domain model

The proposed four concepts are right, with one additional distinction: **an important date's successive occurrences**.

    Account
      +-- Item (purchase / vehicle / passport / maintenance)
           +-- Documents (zero or more)
           +-- ImportantDate (registration / insurance / warranty / cleaning)
                 +-- DateOccurrence (this year's renewal / next service)
                 +-- ReminderOffset (30 days / 6 months)
                       -> NotificationJob for an occurrence

An Item is the durable subject. ImportantDate describes a particular obligation or event stream. DateOccurrence stores an individual due date and completion history. ReminderOffset describes timing; NotificationJob records actual scheduled delivery and provider outcome.

Why occurrences matter: changing “registration 2026” into “registration 2027” must not erase the 2026 history or cause old reminder identities to be reused.

Avoid entity-attribute-value tables and arbitrary user schemas. Keep common filterable fields relational; put only low-volume, template-specific optional details in a validated versioned JSON object. No due dates, ownership, quota counts or delivery status hidden in JSON.

Templates are versioned code/configuration with allowed fields, labels, default offsets and expiry behaviour. Store the applied version on the item. Template updates do not silently rewrite existing dates or opt-ins.

Regulatory rules, if added later, are separately versioned source records: authority URL, jurisdiction, applicability, effective start/end, checked date, reviewer, inputs, exceptions and superseding version. A calculated date retains the version and user confirmation. Stale/unknown applicability falls back to manual entry.

## 12. PostgreSQL / Prisma data model

**Runtime recommendation:** continue Supabase clients and owner-scoped SQL RPCs. A normal privileged Prisma connection does not automatically carry Supabase's user JWT or enforce auth.uid()-based RLS. Do not add it casually beside existing access paths.

The following Prisma notation is an actual proposed relational shape for review, not an executable migration or a complete Supabase installation. Auth/storage tables stay owned by Supabase; SQL migrations must supply cross-schema auth FKs, RLS, grants, checks, partial indexes and transaction functions. If Prisma is later selected as migration owner, move all schema changes into that single pipeline with reviewed custom SQL. Do not run Prisma db push over the current Supabase project. [Prisma relational modelling](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations).

```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["public", "private"]
}

model Profile {
  id                   String    @id @db.Uuid
  displayName          String    @default("") @db.VarChar(160)
  locale               String    @default("en-PH") @db.VarChar(20)
  timezone             String    @default("Asia/Manila") @db.VarChar(80)
  emailEnabled         Boolean   @default(true)
  emailBlocked         Boolean   @default(false)
  deletionRequestedAt  DateTime? @db.Timestamptz(6)
  createdAt            DateTime  @default(now()) @db.Timestamptz(6)
  items                Item[]
  entitlement          Entitlement?
  orders               BillingOrder[]
  @@map("profiles")
  @@schema("public")
}

model Item {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId          String   @db.Uuid
  templateKey      String   @db.VarChar(64)
  templateVersion  Int
  label            String   @db.VarChar(160)
  state            String   @default("draft") @db.VarChar(16)
  notes            String?  @db.VarChar(5000)
  details          Json     @default("{}")
  revision         Int      @default(1)
  createdAt        DateTime @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime @default(now()) @db.Timestamptz(6)
  owner            Profile  @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  purchase         PurchaseDetails?
  dates            ImportantDate[]
  documents        Document[]
  @@unique([id, ownerId])
  @@index([ownerId, state, updatedAt])
  @@index([ownerId, templateKey])
  @@map("items")
  @@schema("public")
}

model PurchaseDetails {
  itemId       String    @id @db.Uuid
  ownerId      String    @db.Uuid
  merchant     String?   @db.VarChar(160)
  purchasedOn  DateTime? @db.Date
  priceMinor   BigInt?
  currency     String    @default("PHP") @db.Char(3)
  category     String?   @db.VarChar(40)
  serialNumber String?   @db.VarChar(160)
  item         Item      @relation(fields: [itemId, ownerId], references: [id, ownerId], onDelete: Cascade)
  @@unique([itemId, ownerId])
  @@index([ownerId, purchasedOn])
  @@index([ownerId, category])
  @@map("purchase_details")
  @@schema("public")
}

model ImportantDate {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  itemId           String    @db.Uuid
  ownerId          String    @db.Uuid
  kind             String    @db.VarChar(40)
  label            String    @db.VarChar(160)
  remindersEnabled Boolean   @default(false)
  consentAt        DateTime? @db.Timestamptz(6)
  consentVersion   String?   @db.VarChar(40)
  disabledReason   String?   @db.VarChar(40)
  recurrenceMode   String    @default("manual") @db.VarChar(30)
  intervalMonths   Int?
  archivedAt       DateTime? @db.Timestamptz(6)
  item             Item      @relation(fields: [itemId, ownerId], references: [id, ownerId], onDelete: Cascade)
  occurrences      DateOccurrence[]
  offsets          ReminderOffset[]
  @@unique([id, ownerId])
  @@index([ownerId, remindersEnabled])
  @@index([itemId, kind])
  @@map("important_dates")
  @@schema("public")
}

model DateOccurrence {
  id                 String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  dateId             String    @db.Uuid
  ownerId            String    @db.Uuid
  cycle              Int
  dueOn              DateTime  @db.Date
  windowStartsOn     DateTime? @db.Date
  startsOn           DateTime? @db.Date
  status             String    @default("open") @db.VarChar(20)
  completedOn        DateTime? @db.Date
  scheduleRevision   Int       @default(1)
  dateSource         String    @default("user") @db.VarChar(30)
  sourceRuleVersion  String?   @db.VarChar(80)
  confirmedAt        DateTime? @db.Timestamptz(6)
  createdAt          DateTime  @default(now()) @db.Timestamptz(6)
  importantDate      ImportantDate @relation(fields: [dateId, ownerId], references: [id, ownerId], onDelete: Cascade)
  notifications      NotificationJob[]
  @@unique([id, ownerId])
  @@unique([dateId, cycle])
  @@index([ownerId, status, dueOn])
  @@map("date_occurrences")
  @@schema("public")
}

model ReminderOffset {
  id             String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  dateId         String  @db.Uuid
  ownerId        String  @db.Uuid
  amount         Int
  unit           String  @db.VarChar(8)
  importantDate  ImportantDate @relation(fields: [dateId, ownerId], references: [id, ownerId], onDelete: Cascade)
  @@unique([dateId, amount, unit])
  @@map("reminder_offsets")
  @@schema("public")
}

model Document {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  itemId           String    @db.Uuid
  ownerId          String    @db.Uuid
  role             String    @db.VarChar(32)
  state            String    @default("pending") @db.VarChar(20)
  originalName     String    @db.VarChar(255)
  stagingKey       String    @unique
  objectKey        String    @unique
  reservedBytes    BigInt
  actualBytes      BigInt?
  mime             String?   @db.VarChar(80)
  checksum         String?   @db.VarChar(64)
  uploadExpiresAt  DateTime   @db.Timestamptz(6)
  createdAt        DateTime   @default(now()) @db.Timestamptz(6)
  item             Item      @relation(fields: [itemId, ownerId], references: [id, ownerId], onDelete: Cascade)
  @@index([itemId, role, createdAt])
  @@index([ownerId, state])
  @@map("documents")
  @@schema("public")
}

model NotificationJob {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  occurrenceId      String    @db.Uuid
  ownerId           String    @db.Uuid
  dueOn             DateTime  @db.Date
  scheduleRevision  Int
  offsetKey         String    @db.VarChar(24)
  channel           String    @default("email") @db.VarChar(16)
  scheduledAt       DateTime  @db.Timestamptz(6)
  nextAttemptAt     DateTime  @db.Timestamptz(6)
  status            String    @default("pending") @db.VarChar(20)
  attempts          Int       @default(0)
  leaseToken        String?   @db.Uuid
  leaseUntil        DateTime? @db.Timestamptz(6)
  firstAttemptAt    DateTime? @db.Timestamptz(6)
  providerId        String?   @unique
  frozenPayload     Json?
  errorCode         String?   @db.VarChar(80)
  acceptedAt        DateTime? @db.Timestamptz(6)
  deliveredAt       DateTime? @db.Timestamptz(6)
  occurrence        DateOccurrence @relation(fields: [occurrenceId, ownerId], references: [id, ownerId], onDelete: Cascade)
  @@unique([occurrenceId, dueOn, offsetKey, channel])
  @@index([status, nextAttemptAt])
  @@index([status, leaseUntil])
  @@map("notification_jobs")
  @@schema("private")
}

model Entitlement {
  ownerId       String    @id @db.Uuid
  premiumUntil  DateTime? @db.Timestamptz(6)
  owner         Profile   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  @@map("entitlements")
  @@schema("public")
}

model BillingOrder {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerId        String?   @db.Uuid
  amountMinor    BigInt
  currency       String    @default("PHP") @db.Char(3)
  status         String    @default("pending") @db.VarChar(20)
  checkoutId     String?   @unique
  paymentId      String?   @unique
  creditedAt     DateTime? @db.Timestamptz(6)
  periodStartsAt DateTime? @db.Timestamptz(6)
  periodEndsAt   DateTime? @db.Timestamptz(6)
  createdAt      DateTime  @default(now()) @db.Timestamptz(6)
  owner          Profile?  @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  events         BillingEvent[]
  @@index([ownerId, createdAt])
  @@map("billing_orders")
  @@schema("private")
}

model BillingEvent {
  providerEventId String   @id
  orderId         String?  @db.Uuid
  type            String   @db.VarChar(100)
  status          String   @db.VarChar(20)
  paymentId       String?
  createdAt       DateTime @default(now()) @db.Timestamptz(6)
  order           BillingOrder? @relation(fields: [orderId], references: [id], onDelete: SetNull)
  @@index([status, createdAt])
  @@map("billing_events")
  @@schema("private")
}

model ObjectDeletion {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bucket         String
  objectKey      String
  notBefore      DateTime @db.Timestamptz(6)
  nextAttemptAt  DateTime @db.Timestamptz(6)
  attempts       Int      @default(0)
  @@unique([bucket, objectKey])
  @@index([nextAttemptAt])
  @@map("object_deletions")
  @@schema("private")
}

model AccountDeletion {
  ownerId      String    @id @db.Uuid
  requestedAt  DateTime  @default(now()) @db.Timestamptz(6)
  completedAt  DateTime? @db.Timestamptz(6)
  @@schema("private")
  @@map("account_deletions")
}
```

SQL requirements beyond the schema:

- Profile.id references auth.users.id ON DELETE CASCADE. No application passwords or duplicate OAuth account tables.
- RLS enabled on every exposed owner table; SELECT requires owner=auth.uid() and an active account. Direct client DML revoked; mutations use narrow checked RPCs with fixed search_path. Private tables are not exposed.
- Composite FKs prevent an Alice-owned document/date/occurrence from referencing Bob's parent, even if application validation fails.
- CHECK constraints whitelist every state/unit/kind; limit offsets, month intervals, lengths, file sizes and positive revisions; money nonnegative; expiry/window end not before start.
- A partial unique index permits at most one open occurrence per ImportantDate. A new cycle and completion update happen in one transaction, protected by revision and account locks.
- Partial due-job and open-date indexes; purchase merchant/name search uses owner-scoped bounded queries initially, adding pg_trgm only when measurements justify it.
- updatedAt maintained by SQL, not solely Prisma @updatedAt, because RPC writes bypass Prisma.
- Atomic item/reminder/storage quotas include concurrent requests and pending byte reservations. Archive does not evade stored-item quotas; deletion releases capacity after the appropriate state transition.
- Document delete triggers enqueue object removal before cascading rows vanish. Cleanup/account-deletion tables deliberately have no cascading owner FK.
- Keep existing operational rate-limit buckets, daily send reservations and delivery-event inbox with unique provider/event keys. Add raw-analytics retention only if analytics is approved.

Purchase detail is a one-to-one extension; vehicle/ID optional presentation fields use validated Item.details. Due dates use PostgreSQL DATE; UTC instants use timestamptz. Serial numbers belong in purchase detail; identity numbers are excluded.

Migration from existing MVP: preserve purchase UUIDs as item UUIDs, extract purchase fields, turn each warranty into one ImportantDate plus cycle 1 occurrence, migrate offsets and sent-job identities, and repoint document parents without moving object keys. Pause workers during cutover. Backfill, compare counts and ownership, test old URLs, then switch writes once; do not run indefinite dual writes. Map old notification keys to new ones so existing acceptance never creates a second email.

## 13. Next.js architecture

    Public visitor -> Next.js public pages -> targeted add entry
                                             |
                                  Google -> Supabase Auth
                                             |
    Signed-in browser -> Next.js actions / server components
                          | verified user + owner-scoped RPC
                          v
                     Supabase PostgreSQL + RLS
                          |              |
                    private Storage   job/payment state
                          ^              ^
                signed upload +       Supabase Cron
                server validation        |
                                   protected workers -> Resend
    PayMongo hosted checkout -> signed webhook -> verified payment -> entitlement

One deployable app, one dedicated database, no Redis or external message broker. Durable PostgreSQL job rows are necessary state, not a microservice queue platform.

Suggested structure:

    app/(marketing)/          homepage, pricing, tracker pages, guides
    app/(account)/            dashboard, items, add flows, settings
    app/auth/callback/        OAuth return
    app/api/cron/             reminders, maintenance
    app/api/webhooks/         payment and email events
    features/templates/      validated definitions, form adapters
    features/items/          reads and atomic commands
    features/dates/           completion, renewal, scheduling
    features/documents/       reservation, validation, download
    content/en-PH/            reviewed marketing/guides
    lib/locale/               formatting and locale-route manifest
    supabase/migrations/      sole active migration source

Public pages should render/cache independently of authentication. Existing root-wide dynamic rendering and global no-store headers should be scoped to private paths when implementing this plan. Keep Supabase refresh/proxy logic away from static marketing where possible. Authenticated results, metadata and responses must never enter a shared cache.

Use Server Components for initial content, small Client Components for interaction, and current Metadata API/file conventions for public SEO. Avoid a universal JSON-form renderer. The find-docs check informed the SQL/Prisma boundary; the installed Next.js documentation informed the route/metadata separation.

## 14. Authentication architecture

Keep a separate Supabase project, Google OAuth client, sessions, buckets, deployment and secrets from other applications. Google redirects to Supabase's provider callback, then Supabase to Keeply's allowlisted callback.

Verify identity server-side for every sensitive read/write; do not trust a browser-supplied userId or an unverified session object. Require fresh authentication for account deletion and, later, access to particularly sensitive scans.

Safe post-login intent contains only an allowlisted template and internal return path. Reject external return URLs. New providers can be enabled through Supabase later; account linking must use verified provider identity, never matching an arbitrary submitted email.

## 15. Private document storage

Use private Supabase buckets. Browser reserves owner-scoped metadata and quota, uploads directly using a short-duration signed capability, then a server finalizer validates and publishes the immutable final object. Do not proxy large file bodies through a normal server action.

Validate actual signatures, byte size, image dimensions, decoder success and allowed formats. Re-encode images and remove metadata. Reject SVG, HTML, executables, archives and unsupported formats. PDF preview must not execute active content on Keeply's origin; download as attachment in V1. Signature checks are not antivirus.

Never send private files to a public virus-scanning website. Before broadening to identity scans or arbitrary documents, choose a private malware-scanning service with an appropriate processing agreement, retention controls and a quarantine → scanned → ready workflow. Its cost is not included in the initial baseline.

Short-lived download links, normally 60 seconds, are bearer capabilities and cannot be made safe merely by unguessable keys. Check ownership before minting them, avoid referrer/log leakage, and invalidate future issuance immediately on deletion. Do not describe documents as end-to-end encrypted: server validation and future OCR require access.

Use durable cleanup with retry and a delay covering in-flight finalizers and upload-token expiry. Back up file bytes separately from database rows.

## 16. Reminder architecture

One recurring scheduler every 15 minutes, not one cron per item. It claims a bounded batch of due jobs using row locks and leases; recovery handles expired leases.

Scheduling: subtract selected days or **calendar months** from dueOn, clamp month-end/leap dates, then interpret 09:00 in the account timezone and store UTC. A 6-month passport reminder is not 180 days. Timezone changes recompute unsent jobs; sent identities remain unchanged.

Unique identity: occurrence + due-date snapshot + offset + channel. Date edits cancel stale unsent jobs; returning to a previously sent date does not resend its offset. A new confirmed renewal creates a new occurrence and can legitimately send a new cycle.

Past thresholds before opt-in are not backfilled. Show the next actual scheduled nudge; a date tomorrow must not misleadingly promise a 30-day email. After a long outage, prefer the latest due threshold and suppress superseded older ones. Expired events remain visible but do not create unsolicited overdue sequences.

Immediately before send, verify consent, account state, current occurrence, date revision and entitlement. Lease-token fencing protects acknowledgements. Freeze payload and reuse the same Resend idempotency key on retry.

At-least-once workers plus provider idempotency reduce duplicates; do not promise mathematical exactly-once email. If acceptance remains unknown near the provider's idempotency expiry, stop and reconcile instead of issuing a new key. Completion/opt-out cannot recall an email already accepted.

## 17. Resend integration

Verified sending domain, authenticated DNS, dedicated API key and signed delivery/bounce/complaint webhook. Distinguish accepted, delivered, bounced, failed and unknown.

Use non-sensitive subject lines by default: “An important date is coming up”. Keep identity numbers, attachments, full plates and signed document links out of emails. Link to the authenticated item screen. Make detailed item-name email content an explicit preference later.

Retry transient timeout/429/5xx outcomes with backoff inside the deduplication window; permanent address/configuration errors need correction. Persist early provider events that arrive before the send response. Suppress bounced/complaining addresses.

Initially retain the conservative 90-attempt/day allowance, count retries, and monitor oldest due work. Budget exhaustion must alert the operator; it is not a reason to quietly promise timely delivery to more users. Resend currently lists 3,000/month and 100/day on Free; Pro is $20/month for 50,000 with no daily cap. [Resend pricing](https://resend.com/pricing). Its idempotency keys last 24 hours. [Resend idempotency](https://resend.com/changelog/idempotency-keys).

## 18. Subscription/payment architecture

Keep **₱360/year, paid upfront, manual renewal**. Describe “₱30/month equivalent, billed ₱360 yearly”; do not display a monthly checkout that does not exist. A second payment extends from max(now, premiumUntil).

PayMongo hosted checkout with enabled GCash/Maya/QR Ph/card options reduces card-data exposure. Server creates the fixed-price order; verified webhook plus provider retrieval grants access. Enforce environment, amount, currency, order and unique payment/event IDs. Browser redirects never grant entitlement.

Manual refund/dispute reconciliation is acceptable for a small pilot if monitored and documented. Recompute entitlement from affected orders; never blindly subtract a year. Deleting an account does not itself refund payment.

After expiry, preserve access to existing documents and history. Block additions beyond Free quotas, and pause extra active reminder dates by a deterministic nearest-due order, explaining which remain enabled. Do not delete paid users' data as an upsell mechanism.

## 19. Philippine localisation strategy

Use en-PH for HTML, formatters and content configuration; PHP minor units for money; Asia/Manila as the default timezone, with account override. Use unambiguous visible dates such as “21 Sep 2026”, native date pickers, and ISO dates in storage.

Terms: receipt, warranty, aircon, OR/CR, registration, insurance renewal and PMS, expanding unfamiliar abbreviations inline. “Driver's licence” and “driver's license” can be naturally supported in search/content without duplicating pages.

Keep market, language and timezone separate. A user abroad may keep Philippine documents with a different reminder timezone. Do not alter saved deadlines automatically on travel.

No forced translation or decorative cultural cues. Local usefulness should survive replacing the logo with plain text.

Show that usefulness inside forms: Car or Motorcycle, registration, insurance renewal, service/PMS and optional warranty dates; peso amounts such as ₱16,999; and the appropriate printed-expiry prompts. The eventual ID chooser may include Driver's Licence, Passport, PRC ID, National ID, UMID and Other, but only the two agreed dates-only identity flows launch in V1. Apply each future document's actual expiry/no-expiry behaviour rather than requiring a date for every ID.

## 20. URL / locale strategy

Recommend **no locale prefix on keeplyph.com**: /warranty-tracker, /vehicle-registration-reminder, /guides/…. The whole initial domain targets the Philippines; /ph adds repetition, while /en-ph adds routing complexity without a current alternative.

Store an internal locale-route mapping so later en-SG/en-MY sites can be introduced without making today’s URLs disposable. If a future neutral global domain is chosen, decide then between regional paths and separate domains. Keep established Philippine URLs or migrate with exact redirects.

Set html lang=en-PH and Open Graph locale=en_PH. With one regional version, omit hreflang rather than inventing alternatives or x-default. When real equivalent variants exist, add reciprocal hreflang including self, and only map genuinely corresponding pages. A country selector can later justify x-default.

Avoid automatic IP redirects. Regional pages with distinct content normally self-canonicalise; near-duplicate English regional pages require a deliberate canonical strategy rather than contradictory annotations. [Google regional guidance](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites), [canonicalisation guidance](https://developers.google.com/search/docs/crawling-indexing/canonicalization).

## 21. SEO keyword architecture

Research status: sample searches found dedicated warranty tools/app listings, broader document-expiry products, and noisy results for narrow local phrases. These checks are directional only: not a reproducible Philippine rank audit, search-volume report, or proof of low difficulty. Examples include [Warranty Tracker](https://www.warrantytracker.app/) and [Etoolio document expiry tool](https://etoolio.com/tools/document-expiry-radar).

| Intent | Examples | Best destination | CTA |
|---|---|---|---|
| Tool/reminder | warranty tracker; passport expiry reminder | A relevant tracker page with working example | Add my warranty / Set my reminder |
| Transactional/commercial | receipt organiser app pricing; best warranty tracker | Pricing or honest comparison | Start free / Compare plans |
| Informational | when is vehicle registration due; how to organise receipts | Reviewed guide/checklist | Save this date / Organise my receipts |
| Navigational | Keeply PH login | Homepage/login | Sign in |
| Government navigational | LTO portal; DFA appointment | Usually official service, not Keeply | Link to official service where context warrants |

Do not pursue “document tracker” blindly: it may mean business compliance, courier tracking, or government application status. Likewise “receipt tracker” may mean expense accounting; clarify Keeply is for retrieval and reminders.

Validation workflow:

1. Group synonyms into 6–8 intent clusters, including expiry/expiration, licence/license and motorcycle/motor phrasing.
2. Obtain Keyword Planner data with Philippines location and explicit language/network settings; inspect close-variant grouping and 12-month seasonality. Google Trends measures relative interest, not absolute volume.
3. Review the first organic results manually for each cluster: page type, government dominance, actual product fit, freshness, backlink strength and a realistic gap. Use a commercial SEO tool only if its cost is justified.
4. Record volume/range, source/date/location, organic difficulty if available, result overlap, conversion relevance and evidence confidence. Leave unavailable metrics blank.
5. Publish a small initial set, connect Search Console, then evaluate impressions/query relevance and item-creation conversions over 8–12 weeks; young sites may need longer.

Keyword Planner “competition” means advertiser competition, **not organic SEO difficulty**. [Google's metric definitions](https://support.google.com/google-ads/answer/3022575?hl=en-uk).

## 22. SEO landing-page architecture

Launch three independently useful product pages: Warranty Tracker, Vehicle Registration Reminder, and Document Expiry Reminder. Add Passport and Aircon pages only when they contain genuinely different examples, guidance and flows. Car/motorcycle can initially be sections on one vehicle page; split after intent evidence supports it.

Keep the homepage concise; focused pages carry detailed examples and search intent. The feedback's /receipt-tracker, /id-expiry-reminder, /passport-expiry-reminder, /car-registration-reminder, /motorcycle-registration-reminder, /car-maintenance-tracker, /appliance-warranty-tracker and /insurance-renewal-reminder are candidate expansions, not extra launch requirements. Initially cover overlapping receipt/appliance needs on Warranty Tracker, licence/passport needs on Document Expiry Reminder, and vehicle needs on the shared vehicle page. Publish a separate page only when its supported flow, distinct user need and substantive content justify it.

Each page needs a unique problem statement, real flow preview, what can be saved, actual timing, required/optional fields, truthful privacy explanation, limitations, relevant official context, FAQs and one matching CTA. Useful pre-signup content can be a printable checklist or on-device date preview. A public date calculator should run in memory without sending entered dates to analytics or URLs.

Use shared layout components, not automatically generated near-identical prose. Do not index hundreds of brand/model/city variants. Publish by editorial allowlist only after the product path works. [Google scaled-content policy](https://developers.google.com/search/docs/essentials/spam-policies).

## 23. SEO → signup conversion strategy

Launch example: /vehicle-registration-reminder#car → “Track my car” → /add/car introduction → Google → /add/car?focus=registration → user-confirmed registration date → optional email reminders → save → confirmation. A later dedicated /car-registration-reminder page can use the same flow.

Warranty page → “Add my warranty” → purchase flow with warranty section expanded. Passport page → expiry-date form with 12/6/3-month timing ready to accept.

Keep source identifiers coarse and allowlisted, e.g. warranty-tracker, not raw referrer/query strings. Protect OAuth return paths and avoid persisting private pre-auth drafts. Measure CTA → authenticated entry → save rather than clicks alone.

Do not gate useful explanations behind login, and do not upload documents before authentication.

## 24. Technical SEO

Public content: server-render or prerender meaningful text, links and metadata; use Metadata API, metadataBase, one canonical per clean URL, distinct titles/descriptions, Open Graph and X cards. Public OG images contain synthetic content only.

Sitemap includes only published canonical public URLs and meaningful content lastmod. robots.txt references it; 404 unknown/unpublished slugs. Use 301/308 exact redirects for moved public content and canonical host variants; avoid redirect chains. Query variants point to the appropriate clean public canonical.

Private routes: authentication and RLS first; private/no-store responses; noindex/nofollow metadata and suitable X-Robots-Tag on private document responses; exclude from sitemap and public links. Never embed an item name, date or image in an unauthenticated metadata/OG response.

Robots disallow is not access control and can stop crawlers seeing noindex. Public login/add entry/demo may be crawlable but noindex; sensitive authenticated paths remain protected even if a crawler ignores robots. If an old URL leaked, revoke access immediately, then handle search removal separately. [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

Performance targets: p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1; measure real devices and field data when available. Keep forms small, avoid heavy animation/third-party scripts, size images explicitly and optimise only public illustrations through shared image caching. Private documents must not enter a public image-optimisation cache.

Semantic headings, descriptive links, accessible forms, breadcrumbs on guides, keyboard tests and real HTML text matter more than adding structured-data types.

## 25. Structured data

Use WebSite on the homepage and truthful Organisation identity/contact where supplied. WebApplication/SoftwareApplication can describe the actual product, browser availability, application category and real offers; BreadcrumbList fits guide/product hierarchy.

Do not fabricate reviews, ratings, download counts or awards to satisfy rich-result requirements. Valid schema.org data does not guarantee Google's enhanced display; software rich-result eligibility has additional requirements. [Google software-app documentation](https://developers.google.com/search/docs/appearance/structured-data/software-app).

Write helpful visible FAQs but do not budget for FAQ rich results: Google restricts these to qualifying authoritative government/health sites. Keeply is not one. [Google FAQ guidance](https://developers.google.com/search/blog/2023/08/howto-faq-changes).

Escape JSON-LD correctly, validate rendered output, and include no private data. Skip SearchAction unless an actual useful public site search exists.

## 26. Internal linking

Homepage → main tracker pages → related guide → matching add CTA. Guides link to their relevant tracker and a small number of genuinely related guides; tracker pages link back to official references where useful.

Use descriptive anchors naturally. Avoid sitewide keyword-heavy footer lists, orphan pages and multiple pages fighting for the same intent. Maintain a page-to-primary-intent map; consolidate overlapping pages rather than manufacturing differentiators.

## 27. Content strategy

Start with practical retrieval/organisation guidance and user-confirmed reminders, where Keeply can add value without pretending to be a government authority.

Every regulatory article records author/reviewer, official source, checked date, effective date if known, applicability and uncertainty. Review such pages monthly during the pilot and whenever an official advisory changes; “updated” must reflect an actual review. Ordinary product guidance can be reviewed quarterly.

Prefer “How to keep your OR/CR and registration date together” over a sprawling renewal-law guide maintained by one developer. Link to current official service/appointment pages. Never promise travel admissibility from a six-month passport rule: destinations and carriers vary.

If a rule cannot be maintained, remove the calculator/claim and keep a manual-date tool. No automated publishing of unreviewed AI government advice.

## 28. Security/privacy

Government-issued identifiers can be sensitive personal information under Philippine privacy law. The expansion raises the trust burden beyond receipts. Establish lawful processing, purpose limitation, minimisation, retention, rights handling and an incident process appropriate to the actual data; obtain a qualified review of the launch policy rather than treating this plan as a compliance certification. [National Privacy Commission, Data Privacy Act](https://privacy.gov.ph/data-privacy-act/).

Mandatory before expanded public V1:

- Owner checks in application and database; RLS on exposed tables; composite parent/owner FKs; no broad service-role CRUD from browser routes.
- Secure verified sessions, strict OAuth redirects, recent re-authentication for account deletion.
- CSRF checks for state changes, same-origin actions, parameterised SQL, output escaping, restrictive CSP and safe upload types.
- Account/operation rate limits, atomically enforced quotas, bounded file decoding and private downloads.
- TLS and provider encryption at rest; secret rotation and restricted operator access. No false E2EE claims.
- No receipt/ID content, filenames, dates, signed URLs or full provider payloads in logs/session replay.
- Verified deletion of rows and bytes; deletion tombstones survive backup restoration; billing retention is purpose-limited and documented.
- Independent encrypted database and object backups; restore drill; defined retention and incident response contacts.
- Dates-only identity templates; optional minimal vehicle/receipt files with clear purpose and truthful security limits.

Later hardening: private malware scanning before identity-scan support, step-up auth for sensitive downloads, richer access audits, optional MFA UX, independent penetration review and carefully scoped field encryption. Field encryption requires a real key-management/recovery design; it is not a substitute for authorisation.

Proposed retention for review: drafts 24 hours, expired upload cleanup after capability expiry, minimal diagnostic logs 14–30 days, pseudonymous raw product events 90 days then aggregate, encrypted backup rotation 30 days. Payment records follow a professionally confirmed applicable retention policy; do not invent a tax retention period. Account deletion should revoke access immediately and complete primary-file cleanup within a published operational target, with alerting when missed.

## 29. Analytics/events

Primary question: **of users who save a first item, how many return on another day and save a second?**

Separate same-session second-item creation from later-session return. Define a cohort by first-item-save week; measure second item within 7/30/90 days, including an explicitly reported different-day rate. Also measure successful reminder-driven retrieval/completion: someone with one passport can still receive substantial value.

| Event | Minimal properties |
|---|---|
| landing_view | canonical page key, locale, coarse source class |
| template_cta_clicked | page key, template key |
| signup_completed | allowlisted entry intent |
| item_creation_started | template key, random draft/session key |
| item_saved | template key, first/second/later ordinal, coarse elapsed-time bucket |
| reminder_opted_in | template key, timing preset ID |
| document_added | allowed MIME family, coarse size bucket; no filename |
| date_completed | template/date kind, no actual date |
| premium_checkout_started / payment_confirmed | plan, mode, confirmed server event |

Allowlist properties; no free text, exact expiry dates, plates, document names, identity numbers, raw search queries, email addresses or replay recordings. Prefer one lightweight first-party collection endpoint and aggregate queries initially; no analytics stack subscription required.

Product cohort IDs are pseudonymous personal data, not anonymous merely because hashed. Disclose processing, establish the appropriate consent/legal basis, provide an opt-out, limit retention and delete the user linkage on account deletion. Measure anonymous public funnels only within the permitted session; do not fingerprint users to connect devices.

Define abandonment from creation-start without save within a stated window (e.g. 24 hours), not just a tab-close event. Exclude demo/test accounts and bots; deduplicate server events. Report denominators and consent coverage, since opt-outs and blockers bias attribution.

## 30. Testing strategy

Test independently: template field/default validation; en-PH money/date formatting; calendar-month arithmetic; leap years; timezone/DST changes; no-expiry behaviour; recurrence from scheduled vs completed date; and stale revisions.

Database tests: cross-owner reads/writes/joins, direct-DML denial, concurrent item/date/file quotas, one-open-occurrence constraint, duplicate completion, changing expiry back to an old date, downgrade, deletion while processing, and service-only function grants.

Workers: overlapping cron runs, lease recovery, stale acknowledgements, provider timeout with unknown acceptance, retry-window exhaustion, bounce suppression, payload immutability, paused schedules and timezone rescheduling.

End-to-end: each template → Google callback → intended form → save → retrieve; private file access with two accounts; no-login metadata leakage; uploads from actual mobile devices; pending/replayed/failed payment; account deletion including bytes.

SEO tests: unauthenticated HTML contains intended public content; exactly one canonical; no private sitemap URLs; valid language/OG tags; noindex rules; redirects/404; JSON-LD; crawlable internal links; p75 performance when enough field data exists.

Usability gate: five participants, including non-technical users, can add a purchase and a renewal without instruction. Observe actual hesitation, not just preference surveys.

Feedback acceptance checks: audit actual colour-token contrast and inspect the secondary text outdoors on a phone; operate the + picker with keyboard and screen reader; follow every homepage category to its promised flow; confirm appliance/warranty aliases reuse the purchase template. With a mixed fixture, verify that dates 11 and 27 days away count as Coming up while passport expiry in eight months appears only under Later. Check due-today/30-day boundaries, overdue separation, archived items and the distinction between reminder slots and emails.

## 31. Deployment

Keep one dedicated Vercel project, Supabase project, sending domain and PayMongo configuration. Retain the selected Hobby/Free starting arrangement; no hosting change is proposed here. Supabase Cron invokes protected HTTP workers, independent of Vercel cron cadence.

Use a separate local/test environment for integration tests; production previews must not send customer email or accept live payments. Apply reviewed migrations before code that depends on them; use feature flags for template rollout, not parallel inconsistent data models.

Domain DNS and canonical host: keeplyph.com with HTTPS; redirect www if configured. Marketing can be cached; authenticated content cannot. No Cloudflare migration is needed.

Before migration from the existing prototype, inventory whether real accounts/data exist. Do not assume it is safe to reset the database just because it started as an MVP.

## 32. Monitoring

Track auth/upload/save failures, slow queries, storage/egress, quota rejections, oldest due notification, worker lease recovery, bounced mail, webhook failure rate, pending uncredited orders, cleanup backlog and incomplete account deletions.

Alert on sustained worker failures or missed runs, backlog older than one hour during normal capacity, payment confirmation delays, cleanup beyond the published target, and 70%/85% project capacity thresholds. Tune after observing normal behaviour.

Inspect HTTP worker results as well as cron scheduling status. Use request IDs and error codes without private payloads. Have one named operator and written recovery procedures before billing users.

## 33. Estimated operating costs

Provider prices checked for planning on 21 September 2026. PHP conversion below uses **₱60/USD as an assumption**, not a live rate. Taxes, bank conversion, backups and support time are separate.

Current selected fixed baseline: user-quoted domain ₱700/year (term/renewal unverified), Vercel Hobby $0, Supabase Free $0, Resend Free $0, PayMongo standard checkout with transaction fees. That is ₱700/year only **while actual usage fits those limits**.

Supabase Free lists 500 MB database, 1 GB files and 5 GB egress, with inactivity pausing; Pro starts at $25/month and lists 100 GB files plus 250 GB egress. A 2 GB per-user allowance therefore cannot be treated as capacity provided by the Free project. [Supabase pricing](https://supabase.com/pricing).

Paid growth reference: Supabase $25 + Resend $20 + optional Vercel Pro $20 = $65/month or about ₱3,900 before domain and extras. Vercel currently lists Pro at $20/month. This is a planning reference, not an instruction to buy it. [Vercel pricing](https://vercel.com/pricing).

Illustrative demand assumption: 10 items/user, 2 optimised 0.5 MB files/item = 10 MB/user; 6 emails/user/month average. This is a sensitivity model, not a forecast.

| Users at that usage | Stored files | Emails/month | Likely planning implication |
|---:|---:|---:|---|
| 10 | 0.1 GB | 60 | Free tiers can fit; domain plus backup/operations provision |
| 100 | 1 GB | 600 | At Free storage ceiling before staging/backups; budget roughly ₱1,500/month if moving Supabase to Pro |
| 1,000 | 10 GB | 6,000 | Paid database/email likely; roughly ₱2,700–₱3,900/month base depending on hosting tier |
| 10,000 | 100 GB | 60,000 | At included Pro storage before overhead; at least about $74/₱4,440 monthly reference if using the $65 stack plus 10k email overage, before extra compute/storage/egress/backups |

Daily bursts can exceed email capacity even when monthly totals fit. Files and download frequency, not user count alone, dominate storage/egress. Monitor staging overhead and never let a budget estimate imply an SLA.

PayMongo published fees exclude VAT: QR Ph 1.34%, GCash 2.23%, Maya 1.79%, domestic cards 3.125% + ₱13.39. Standard has no setup/monthly fee. [PayMongo pricing](https://www.paymongo.com/en/pricing).

| Collection | QR Ph fee / net | GCash fee / net | Domestic card fee / net |
|---|---:|---:|---:|
| ₱30 monthly | ₱0.40 / ₱29.60 | ₱0.67 / ₱29.33 | ₱14.33 / ₱15.67 |
| ₱360 yearly | ₱4.82 / ₱355.18 | ₱8.03 / ₱351.97 | ₱24.64 / ₱335.36 |

These are arithmetic examples **before VAT on applicable fees**, payout costs, refunds, merchant tax obligations and support. They do not confirm a provider/method's minimum transaction amount or recurring mandate capability. Annual collection avoids repeated fixed card fees and renewal friction.

At approximately ₱350 net annual receipts, a ₱3,900/month infrastructure baseline needs roughly 134 paying users just for that cost (46,800/350), before tax/support/backups. At 5% conversion that implies about 2,680 registered users, with substantial uncertainty. Treat ₱360 as an introductory pricing hypothesis; do not sell unlimited storage to make it sound more valuable.

## 34. Development phases

| Phase | Deliverable | Independent acceptance gate |
|---|---|---|
| 0 | Approve scope; interviews; paper/clickable flow review | Users recognise a real need; existing app untouched |
| 1 | Generic model and migration rehearsal | Ownership/count/history checks; zero duplicate sends |
| 2 | Purchase flow on new model | Existing receipt functionality and URLs still work |
| 3 | Vehicle + dates-only document flows | One item can have multiple independent dates |
| 4 | Maintenance completion and recurrence | History preserved; next date confirmed once |
| 5 | Hardened uploads/reminders/limits/billing | Failure/concurrency/provider tests pass |
| 6 | Localised public site + three SEO pages | Crawl, metadata, privacy and conversion tests pass |
| 7 | Small monitored pilot | Delivery, retrieval, second-item behaviour measured |

Indicative solo-developer effort: several focused weeks, not a weekend, especially when provider setup, mobile QA, privacy review and migration are included. Dates should be estimated after inspecting the existing implementation and agreeing acceptance criteria.

## 35. Implementation order

Approve the plan first. Then inventory existing data, agree template/date semantics, design occurrence identity, rehearse SQL migration, preserve the purchase flow, add vehicles/documents, implement completion/recurrence, harden worker delivery, finish quota/billing behaviour, build public SEO pages, instrument the minimal funnel, and run the pilot.

Do not build the SEO page factory before the matching product flows work. Do not rewrite all current code just to change Purchase into Item.

## 36. MVP launch checklist

- Seven agreed entry choices with understandable forms and optional fields.
- Google onboarding returns to the intended template.
- No identity scan/number demanded for date-only workflows.
- Explicit consent and accurate next-reminder display.
- User-confirmed regulatory dates; reviewed official references.
- Private Storage/RLS and two-account access tests.
- Recurrence, duplicate events, downtime and deletion races tested.
- Provider test/live separation; verified payment and delivery webhooks.
- Free/Premium limits described in dates, not ambiguous “reminders”.
- en-PH, PHP, timezone/date behaviour and accessible mobile UI verified.
- Mixed-item dashboard labels/counts, Later grouping and accessible + template picker verified.
- Category discovery and “10 things for free” copy match available flows and all Free limits.
- Public canonical metadata, sitemap, 404/redirect/noindex tests complete.
- No private content in metadata, logs, analytics or shared caches.
- Support contact, retention, privacy and refund procedures reviewed.
- Independent database/files restore drill and operator alerting working.
- No unsupported marketing claims or fabricated SEO metrics.

## 37. Post-MVP roadmap

First improve observed friction and reliability. Then consider PRC and standalone insurance, additional maintenance presets, safer identity-document storage after security review, and OCR for receipts.

OCR design: immutable source document → extraction attempt with provider/model/version → candidate fields/confidence → user confirmation → normal save command. Never overwrite confirmed values silently. Obtain appropriate consent for third-party document processing; limit retention; do not send identity scans by default. Start with receipts/screenshots/PDF invoices, including e-commerce layouts, and report per-field correction rates.

Household sharing later needs explicit memberships, per-item access and shared-file policies; do not add a householdId placeholder and claim sharing is solved. Warranty transfer should copy/share selected material with expiry/revocation and audit, never transfer an entire account.

Calendar export or push notifications can follow evidence that email is insufficient. SMS, messaging integrations, full offline sync, arbitrary automation and an all-purpose life-management platform remain separate investments.

---

## A. Recommended Keeply positioning

“Your important things, remembered.” A private place for receipts/documents and practical reminders, built around Philippine tasks with internationally polished design.

## B. Exact MVP feature list

Google sign-in/out; personal items; optional private files; multiple dates per item; seven template choices; upcoming/overdue and retrieval views; name/type/date search; explicit email opt-in with template timings; simple completion/renewal history; timezone/settings; Free/Premium limits; ₱360 annual manual renewal; account/file deletion; three substantial product landing pages; localised metadata; minimal privacy-conscious analytics; tested backup/recovery and monitoring.

## C. Exact V1 templates

Receipt & Warranty; Car; Motorcycle; Driver's Licence (dates only); Passport (dates only); Aircon Maintenance; Other Important Date. Appliances are a purchase shortcut; vehicle insurance/service are dates on the vehicle.

## D. Database summary

Profile → Item → Document and ImportantDate → DateOccurrence. ReminderOffset defines timing; NotificationJob records delivery. PurchaseDetails extends purchases. Entitlement, BillingOrder and BillingEvent handle access/payment. Independent object/account deletion queues survive row cascades. SQL owns RLS, quotas and transactional invariants.

## E. Homepage structure

Hero → “What should Keeply remember for you?” category cards → “See everything Keeply can track” → labelled example → three-step explanation → truthful privacy explanation → “Keep up to 10 things for free” with reminder/storage limits → FAQs → help/legal footer. Preserve the existing visual style and warm copy; dashboard cards become Saved items / Active reminders / Coming up.

## F. SEO site architecture

    /
    /pricing
    /warranty-tracker
    /vehicle-registration-reminder
    /document-expiry-tracker
    /guides/...
    /passport-expiry-reminder       later, when distinct and validated
    /aircon-maintenance-reminder    later, when distinct and validated
    /add/{template}                 noindex; preserves focused intent
    /dashboard, /items/*, /settings private; never in sitemap

Car/motorcycle pages may replace the shared vehicle entry after search-intent validation. Do not publish both overlapping versions without a clear primary target and redirect/canonical plan.

## G. Recommended URL/localisation structure

No /ph or /en-ph prefix on keeplyph.com. en-PH content/HTML, en_PH Open Graph, PHP money and Asia/Manila default. No hreflang until actual alternate versions exist. Maintain an internal locale-route manifest for future regional expansion.

## H. First 20 SEO opportunities

**Priority reflects product fit and standalone usefulness, not verified demand or keyword difficulty. No search-volume claims are made.** Tool=reminder/tool, Info=informational, Commercial=transactional/comparison, Nav=navigational. Initial publication is deliberately much smaller than this backlog.

| # | Opportunity / query family | Intent | Proposed destination | Standalone value and CTA | Timing |
|---:|---|---|---|---|---|
| 1 | Warranty tracker Philippines | Tool | /warranty-tracker | Coverage/receipt example; Add my warranty | Initial |
| 2 | Vehicle registration reminder Philippines | Tool | /vehicle-registration-reminder | Manual confirmed date/window; Track my vehicle | Initial |
| 3 | Document expiry reminder | Tool | /document-expiry-tracker | Expiring vs non-expiring examples; Add an expiry | Initial |
| 4 | Receipt organiser / receipt tracker | Tool | /warranty-tracker#receipts | File retrieval demo; Save my receipt | Same page initially |
| 5 | Passport expiry reminder | Tool | /passport-expiry-reminder | Calendar-month preview; Set passport reminder | Validate next |
| 6 | Aircon cleaning reminder | Tool | /aircon-maintenance-reminder | Last clean → chosen interval; Add my aircon | Validate next |
| 7 | Motorcycle registration reminder | Tool | /motorcycle-registration-reminder | Motorcycle-specific document/date example; Track my motorcycle | Split only with evidence |
| 8 | Car registration reminder | Tool | /car-registration-reminder | Registration + insurance example; Track my car | Split only with evidence |
| 9 | Driver's license expiry reminder Philippines | Tool | /drivers-license-expiry-reminder | Printed-date workflow; Set licence reminder | Later distinct page |
| 10 | Appliance warranty tracker | Tool | /warranty-tracker#appliances | Appliance example/serial field; Add my appliance | Same page initially |
| 11 | How to organise digital receipts | Info | /guides/organise-receipts | Practical naming/storage checklist; Save a receipt | Early guide |
| 12 | What to keep for a warranty claim | Info | /guides/warranty-documents | Document checklist without claim guarantees; Organise a purchase | Early guide |
| 13 | Keep OR/CR and renewal dates together | Info | /guides/organise-vehicle-documents | Document roles/privacy checklist; Track my vehicle | Early guide |
| 14 | How to check my registration due date | Info | /guides/check-registration-date | Official-source/exception guidance; Save confirmed date | Only with review capacity |
| 15 | Passport expiry versus travel validity | Info | /guides/passport-expiry-and-travel | Distinguish expiry from destination rules; Save expiry | Source-reviewed |
| 16 | Insurance renewal reminder | Tool | /insurance-renewal-reminder | Vehicle insurance first; Add renewal to my vehicle | Standalone template later |
| 17 | PRC ID expiry reminder | Tool | /prc-id-expiry-reminder | Printed date + official renewal links; Set PRC reminder | After V1.1 template |
| 18 | Home maintenance reminder / water filter | Tool | /home-maintenance-reminder | Completion-based schedules; Add a maintenance date | After usage evidence |
| 19 | Receipt/warranty organiser pricing | Commercial | /pricing | Real caps, annual price and renewal terms; Start free | Initial support page |
| 20 | Keeply PH / Keeply login | Nav | / and /login | Clear brand destination and sign-in; Continue | Homepage indexable; login noindex |

These 20 opportunities are **not 20 required landing pages**. Fragment targets intentionally consolidate overlapping search intent; they are not separately indexable pages.

## I. Step-by-step implementation sequence

Approve scope → inspect existing data → specify template/occurrence contracts → migration rehearsal → preserve purchases → vehicles/document dates → maintenance history → worker/idempotency upgrade → quota/billing/deletion tests → en-PH public site and SEO → privacy-conscious funnel measurement → small monitored beta → expand only from evidence.

## J. First 10 development tasks after approval

1. Inventory current schema, provider configuration and any real data; establish backup/rollback.
2. Write acceptance examples for seven templates and the three-active-date Free limit.
3. Specify due-date/occurrence/completion semantics, including non-expiring documents.
4. Create versioned template definitions with explicit opt-in copy and optional fields.
5. Draft/review SQL migration and composite ownership constraints.
6. Rehearse migration on a disposable copy, preserving document and notification identities.
7. Adapt the purchase flow without losing existing functionality.
8. Build vehicle and dates-only passport/licence paths with targeted OAuth return.
9. Add maintenance completion/next-date confirmation and worker tests.
10. Implement public route metadata/content separation and the first three matched SEO funnels.

## K. What not to build yet

No generic workflow builder, automated regulatory calculator, assumed validity renewal, full identity-number repository, medical scheduler, hundreds of SEO pages, forced localisation theme, SMS/WhatsApp, household permissions, transfer marketplace, OCR before core usability, unlimited storage, monthly card subscription at ₱30, Redis, microservices, Kubernetes or a second ORM/migration authority.

## L. Biggest risks and cheap validation

| Risk | Cheap test | Proposed decision signal, not an industry benchmark |
|---|---|---|
| Broad product is hard to understand | Five unprompted mobile usability sessions | At least 4/5 complete the intended flow without explanation |
| Users save once and disappear | Invite 20–30 target users; track 30-day cohorts | Inspect different-day second-item saves and reminder-driven retrieval; interview non-returners |
| Email is ignored | Controlled opt-in pilot and follow-up interviews | Delivery alone is insufficient; ask whether the reminder prompted useful action |
| People distrust document uploads | Offer date-only and optional-file paths | Compare completion and interview reasons; never force scans to improve attachment rate |
| Search demand is too small or mismatched | Planner + result review + three useful pages | Relevant impressions and actual saves, not keyword-tool scores alone |
| Regulatory content becomes wrong | Manual confirmed-date V1 and source review | Do not ship a calculator until exception coverage and maintenance ownership exist |
| Low annual price cannot cover support/storage | Price interview plus genuine paid beta | Track net contribution per payer and per active free user; no invented conversion assumption |
| Reminders duplicate or arrive late | Fault-injection, outage and replay tests | Reliable recovery with visible operator alerts before public promises |
| Migration breaks old receipts or sends twice | Disposable-copy rehearsal and identity mapping | Counts, ownership, URLs and provider dedupe preserved |
| Identity-document scope outpaces security | Dates-only launch; external review before scans | Add sensitive uploads only when controls and user value justify them |

Approval should cover the exact template set, dates-only identity scope, reminder-slot definition, annual price, no-prefix URLs, and the migration approach. Until that approval, this remains a planning document and the existing application remains unchanged.
