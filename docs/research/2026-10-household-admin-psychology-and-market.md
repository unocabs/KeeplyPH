# What households need Keeply to take off their minds

Research and product direction for Philippine households managing bills, home maintenance, and purchases/warranties.

Prepared 12 October 2026. Product and source availability were reviewed on that date. This is a desk-research report, not a usability test, a representative consumer survey, or a security audit.

## The decision this research supports

Keeply should become the place where a household can answer five questions confidently:

1. What needs attention?
2. What do we need to do next?
3. Who is handling it?
4. Has it actually been handled?
5. Where is the proof, and what happens next time?

The opportunity is larger than bill reminders. It is also more demanding than collecting many features in one app. Household administration includes noticing a need, finding information, making a decision, arranging action, checking the outcome, and keeping the information available for the next person or the next occurrence. A notification addresses only a portion of that work.

**Recommended product promise:** Keep your household obligations organised, from what needs attention to the records that show what was done.

This is a strategic recommendation, not a finding that users have already validated this exact proposition. The strongest existing evidence supports reducing memory demands and coordination effort. The exact interface, willingness to pay, and impact of Keeply need testing with real households.

“Everything in one place” is insufficient differentiation. HomeZada combines maintenance, inventory, documents, and finances. Itemtopia connects belongings with receipts, warranties, and service records. FamilyWall combines calendars, lists, budgets, and documents. Keeply must compete on how clearly and reliably the whole experience works. [HomeZada](https://www.homezada.com/faq), [Itemtopia](https://www.itemtopia.com/home-inventory-app/), [FamilyWall](https://www.familywall.com/premium.html?lang=en)

## 1. Scope, method, and confidence

The review covers **37 current products or services and one historical case**, across bill reminders, budgeting, payments, family coordination, cleaning, home records, and general task tools. It includes international products and Philippine alternatives. This is broad category coverage, not a claim to have reviewed every app in existence.

Sources include official product pages and help centres, selected public app-store reviews, selected Philippine community discussions, peer-reviewed research, manufacturer warranty terms, and Keeply's repository. Reviews were sampled for concrete descriptions of usefulness, friction, and consequential failures. They were not systematically coded into a representative dataset. There is no defensible percentage of users affected by any complaint in this report.

Evidence labels used throughout:

| Label | What it means | What it does not establish |
|---|---|---|
| Research finding | A published study reports a result in its sample and setting. | That the result applies equally to Philippine households, or that Keeply produces the same effect. |
| Documented capability | An official page or current listing describes a feature or limitation. | Hands-on performance, availability in every market, or integration quality. |
| User report | A reviewer or community member describes an experience. | A verified defect, prevalence, a representative preference, or the current state of an older version. |
| Repository observation | Relevant Keeply source or documentation was inspected. | Deployed behaviour, real-device delivery, provider acceptance, or a complete audit of every code path. |
| Recommendation or hypothesis | A design or business conclusion drawn from the evidence. | Established demand or a proven commercial result. |

Official documentation can lag a release. Storefronts vary by region, operating system, and subscription. A feature not found on the pages reviewed is not automatically absent. Some review pages omit the year on individual entries, and those entries should not be treated as dated defect evidence. Historical complaints are labelled accordingly. No competitor account was purchased or exercised end to end for this report.

## 2. The psychology: what people are asking the app to carry

### 2.1 Relief from having to stay mentally on duty

Daminger's qualitative study of 35 couples distinguishes anticipation, identifying options, deciding, and monitoring as components of household cognitive labour. The work can continue even when no visible chore is happening. In that sample, anticipation and monitoring were particularly gendered. This is a useful framework, not a population estimate for Philippine households. [Daminger, 2019](https://journals.sagepub.com/doi/10.1177/0003122419859007)

**Design inference:** A reminder that says “aircon cleaning due” still leaves the household remembering the technician, finding the last service date, coordinating access, checking completion, and keeping the receipt. Keeply earns relief by carrying the context around the obligation, not just its date.

**Implication for sharing:** An app has not meaningfully shared responsibility if one person must enter every record, assign every task, chase every update, and confirm every result. That person is still the household's administrator. Shared access is necessary for some households, but access alone does not transfer ownership.

### 2.2 Confidence that an external memory will work

Laboratory research by Boldt and Gilbert found that confidence influences spontaneous use of external reminders, and that offloading intentions can support performance. Chiu and Gilbert's preregistered experiments found that increasing the physical effort of setting reminders reduces their use. These studies concern controlled tasks, not household-app onboarding, but they support taking both confidence and setup effort seriously. [Boldt and Gilbert, 2019](https://pubmed.ncbi.nlm.nih.gov/31792746/), [Chiu and Gilbert, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11103908/)

**Design inference:** The person must believe both “I can put this here easily” and “I will be able to rely on it later.” Beautiful screens cannot compensate for a lost attachment, silent notification failure, or recurrence that advances incorrectly.

Capture should allow an imperfect starting point. “Electricity bill, date not checked yet” is a legitimate record. The system can help the person complete it later. Requiring full provider, amount, account, recurrence, attachment, and alert settings before saving makes remembering the household depend on finishing a form.

### 2.3 A credible next step, not simply another unfinished item

Masicampo and Baumeister's experiments found that making specific plans for unfinished goals reduced some intrusive-thought and task-interference effects. This does not establish that storing any task in an app creates relief. The specificity of the plan matters. [Masicampo and Baumeister, 2011](https://pubmed.ncbi.nlm.nih.gov/21688924/)

**Design inference:** “Warranty expires soon” becomes useful when the record also makes the next action clear: inspect the appliance, locate the receipt, check the manufacturer's terms, or contact the service channel. A large list of unresolved alerts can preserve uncertainty instead of reducing it.

Dates also have different meanings. A payment deadline, an estimated maintenance window, an inspection reminder, and the end of a parts warranty should not all be presented as equally urgent obligations.

### 2.4 Dignity when the household cannot do everything

Research by Gladstone and colleagues across six studies links financial shame with withdrawal and further financial difficulties. This does not prove that a particular notification colour or phrase causes avoidance. It gives a reason to test respectful communication and recovery flows carefully. [Gladstone et al., 2021](https://www.sciencedirect.com/science/article/abs/pii/S0749597821000662)

**Design inference:** A household that cannot afford a bill needs a clear record and a practical next step. Repeating “overdue” more aggressively does not create money. A household that has fallen behind on maintenance needs a manageable way back, rather than a dashboard that makes every old item appear equally catastrophic.

Keep actual due dates intact. Allow people to defer a reminder, record a partial payment, note an arrangement, correct an entry, or decide that a task was skipped. A snooze should never silently rewrite the obligation's deadline.

### 2.5 Control over attention

In a randomized field experiment with 237 participants, Fitz and colleagues found benefits to delivering notifications in batches for measures including attention, perceived control, and mood. Eliminating notifications entirely also had drawbacks. This was not a household-deadline study and does not establish that bills should be delivered exactly three times per day. [Fitz et al., 2019](https://scholars.duke.edu/publication/1402953)

**Design inference:** Test a grouped summary for nonurgent obligations, with carefully chosen exceptions for time-sensitive items. Give people control over timing and channel. A reminder should usually contain enough context to decide what to do without opening several screens.

Opening the app more often is not inherently a success. If a user checks repeatedly because they distrust the saved status or fear a missed alert, engagement is a symptom of product failure.

### 2.6 Fairness, recognition, and privacy within a household

A study of 322 mothers of young children found associations between cognitive household labour and measures of stress, burnout, depression, and relationship quality. The evidence is self-reported and associational. It does not prove causation, establish Philippine prevalence, or show that household software improves mental health. [Aviv et al., published online 2024](https://pubmed.ncbi.nlm.nih.gov/38951218/)

**Design inference:** Help members see responsibility and context, but do not claim that counting completed tasks measures fairness. Arranging a repair and physically letting in the technician are different contributions. Making a decision, handling exceptions, and monitoring a result can remain invisible in a simple leaderboard.

Households also have legitimate boundaries. A shared appliance warranty and a private health document need different access. “Household” should not imply that every member may see every document or financial record.

### 2.7 Continuity when life changes

**Hypothesis to validate locally:** The records become especially valuable when the usual administrator is busy, ill, away, caring for someone, or no longer responsible for a property. The emotional job is continuity: another authorised person can understand the situation without a long briefing.

This is a stronger test than “can two people view the same list?” Can the second person find the service provider, understand what was attempted, identify what is still unresolved, and retrieve the right document?

### 2.8 A habit that fits the obligation

A systematic review of health-related habit formation found considerable variation and methodological limitations. It does not support a universal 21-day habit promise, and its findings should not be treated as a schedule for household-app adoption. [Singh et al., 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11641623/)

**Design inference:** Do not demand daily use of a product whose most valuable jobs may occur monthly or seasonally. Anchor usage to real moments: a bill arrives, a service is completed, an appliance is purchased, or a household member asks where a document is.

### The psychological contract

| What the person wants to feel | What the product must make possible | How the product can break that trust |
|---|---|---|
| “I can stop keeping this in my head.” | Easy capture and dependable retrieval. | Complicated setup, missing records, weak search. |
| “I know what matters now.” | A prioritised, understandable view. | A wall of equally urgent alerts. |
| “I know where we stand.” | Honest status, dates, and amount certainty. | Treating an estimate or scheduled payment as a confirmed outcome. |
| “Someone else can handle it.” | Clear responsibility and enough context. | Sharing a list while leaving one person to coordinate everything. |
| “We can recover.” | Corrections, partial progress, and a manageable return. | Shame, irreversible mistakes, broken recurrence. |
| “Our records remain ours.” | Appropriate access, deletion, and a credible exit path. | Surprise access, opaque retention, or dependence without portability. |

These are proposed design requirements. They are not survey rankings.

## 3. The competitive landscape

The tables distinguish a product's documented strength from the boundary Keeply should investigate. A boundary is not necessarily a defect. A specialist may be excellent precisely because it concentrates on a narrower job.

### Bill reminders and subscriptions

| # | Product | Documented strength and likely human value | Boundary or lesson for Keeply |
|---|---|---|---|
| 1 | [TimelyBills](https://www.timelybills.app/) | Bills, expense tracking, budgets, and family capabilities. Can consolidate financial dates and household visibility. | A serious direct competitor for bills. Optional bank connections and broader finance features can add setup and reconciliation demands. Actual Philippine bank coverage needs separate verification. |
| 2 | [Chronicle](https://chronicleapp.com/) | Apple-focused bill organisation, history, estimates, and forecasting. Its [Pro documentation](https://littlefin.zendesk.com/hc/en-us/articles/360055008411-What-s-Included-in-Chronicle-Pro) includes sharing and longer planning. | Shows that manual tracking and future visibility have value without payment execution. Apple platform coverage is a household adoption constraint. |
| 3 | [BillOut](https://play.google.com/store/apps/details?id=com.pvveb.billout) | Flexible bill recurrence, sharing, reports, and totals between salary dates. | A direct competitor for simple bill organisation. The developer explicitly distinguishes tracking from payment execution. Recovery of an account/key is part of the trust experience. |
| 4 | [Bills Organizer & Reminder](https://apps.apple.com/us/app/bills-organizer-reminder/id1352782733) | Recurring and one-off bills, quick paid actions, Apple sync, export, and device access controls. | Demonstrates the appeal of a small, direct workflow. A household record still needs context beyond a payment date. |
| 5 | [Bobby](https://bobbyapp.co/) | A visually simple subscription overview, recurring costs, and reminders. | Makes recurring spending legible with little conceptual overhead. Keeply should preserve that clarity while handling different kinds of obligations honestly. |

### Budgeting, cash flow, and shared expenses

| # | Product | Documented strength and likely human value | Boundary or lesson for Keeply |
|---|---|---|---|
| 6 | [YNAB](https://www.ynab.com/features) | Budget allocation, targets, future obligations, and household subscription sharing. Gives money a deliberate plan. | A deeper behavioural and financial commitment than saving household obligations. [Direct import regions](https://support.ynab.com/en_us/my-bank-isnt-listed-HJivlLavle) do not include Philippine institutions; manual use remains possible. |
| 7 | [Monarch](https://www.monarchmoney.com/features/collaboration) | Collaborative financial overview and [recurring bill/expense tracking](https://help.monarch.com/hc/en-us/articles/4890751141908-Tracking-Recurring-Expenses-and-Bills). | Official availability is [US and Canada](https://help.monarch.com/hc/en-us/articles/19985735202068-FAQs-about-Monarch). Current products include forecasting, so older complaints about its absence are not reliable current comparisons. |
| 8 | [Quicken Simplifi](https://support.simplifi.quicken.com/en/articles/3357429-using-projected-cash-flow) | Projected account cash flow from income and recurring obligations. Helps users see timing rather than just a monthly average. | Its documented account projection has specific exclusions, including planned spending and savings goals. Keeply must disclose the scope of any forecast rather than imply complete affordability. |
| 9 | [Rocket Money](https://help.rocketmoney.com/en/collections/110540-managing-subscriptions-with-rocket-money) | Recurring spending visibility and help with eligible cancellation requests. Connects insight with an action. | [US users and banks](https://help.rocketmoney.com/en/articles/79778-does-rocket-money-support-international-banks). Cancellation is provider-dependent, not a universal capability Keeply can promise. |
| 10 | [Wallet by BudgetBakers](https://support.budgetbakers.com/hc/en-us/articles/12212428113810-What-is-the-Wallet-app) | Manual or connected accounts, budgets, shared financial tracking, and planned payments. | [Planned-payment documentation](https://support.budgetbakers.com/hc/en-us/articles/7149523920786-Setup-Planned-Payments) identifies platform and recurrence edge cases. Recurring dates and multi-device consistency deserve explicit testing. |
| 11 | [Money Manager by Realbyte](https://help.realbyteapps.com/hc/en-us/articles/360046668993-How-to-set-up-a-repeat-schedule-installment) | Repeat income/expense entries and instalment schedules within a ledger. | Automatic generation of an expense record is not evidence that a bill was paid. Keeply should keep accounting automation and actual completion conceptually separate. |
| 12 | [Splitwise](https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-recurring-expenses) | Splitting costs and recurring shared expenses. Reduces ambiguity about who owes whom. | A financial share does not identify who books the service, checks payment posting, or keeps the receipt. Coordination and reimbursement are related but different jobs. |
| 13 | [doxo](https://www.doxo.com/w/support/) | A payment service that exposes delivery timing and method-dependent fees before submission. | Illustrates the operational burden of payments. Keeply should avoid payment promises without provider support, clear timing, dispute handling, and verified end-to-end behaviour. |

### Family coordination

| # | Product | Documented strength and likely human value | Boundary or lesson for Keeply |
|---|---|---|---|
| 14 | [Cozi](https://www.cozi.com/feature-overview/) | Shared calendars, lists, and meal planning. Gives family members a common view of the week. | Shared visibility can reduce repeated questions. Obligation outcomes, evidence, and access boundaries still require a deliberate model. Do not assume legacy authentication descriptions reflect the current product. |
| 15 | [FamilyWall](https://www.familywall.com/) | Calendars, lists, messaging, budgets, documents, and broader family functions. | Already overlaps the proposed category substantially. Keeply needs a clearer bills/maintenance/warranty workflow, not the claim that competitors only do calendars. |
| 16 | [Maple](https://www.growmaple.com/calendar) | Shared calendar/task organisation and [email-to-event capture](https://blog.growmaple.com/blog-posts/introducing-maple-fast-events-automate-adding-events-to-your-shared-family-calendar). | Demonstrates demand for reducing re-entry. Extraction still needs clear review, correction, and source traceability when mistakes have consequences. |
| 17 | [Ohai](https://www.ohai.ai/blog/meet-the-new-ohai/) | Household assistance through calendar/task coordination and information extraction. Its April 2026 launch article explicitly discusses making the product easier to understand. | An intelligent assistant is only useful when people understand what it can do and what happened. That launch article separates some future capabilities from launched ones; availability must be checked independently. |
| 18 | [Skylight Calendar](https://www.skylightframe.com/lp/calendar-syncing/) | A shared physical display with calendars, lists, and household functions. Makes information visible without requiring every member to open an app. | The lesson is ambient shared visibility. Hardware cost and local support make it a different adoption proposition, not a verified purchase recommendation for Philippine households. |

### Cleaning and recurring maintenance behaviour

| # | Product | Documented strength and likely human value | Boundary or lesson for Keeply |
|---|---|---|---|
| 19 | [Sweepy](https://sweepy.com/) | Suggested cleaning tasks, effort-based daily planning, household participation, and game elements. Reduces the decision of what to do next. | Setup can still be work. Competition and points fit some households better than others. Cleaning frequency should not be confused with appliance service requirements. |
| 20 | [Tody](https://todyapp.com/method) | Room/task breakdown, visible due status, and planning around completed cleaning. Makes gradual deterioration easier to notice. | The key transferable insight is actionable small steps and meaningful completion. Exact due dates and “after completion” schedules need different behaviour. |

### Home inventory, records, and warranties

| # | Product | Documented strength and likely human value | Boundary or lesson for Keeply |
|---|---|---|---|
| 21 | [HomeZada](https://www.homezada.com/faq) | Inventory, maintenance, projects, finances, document storage, family invitations, and inventory/file exports. | A strong adjacent comprehensive product. Its breadth can require substantial initial recording. Keeply's differentiation must include a lower-friction path to useful household outcomes. |
| 22 | [Itemtopia](https://www.itemtopia.com/home-inventory-app/) | Item-centric receipts, warranties, service information, and sharing. The [current Android listing](https://play.google.com/store/apps/details?hl=en_US&id=com.itemtopia.app) also describes offline use and receipt capture. | Another direct adjacent competitor. Do not pretend that attaching receipts or combining maintenance with warranties is unique. Offline and sharing claims were documented, not independently tested. |
| 23 | [Centriq](https://centriqhome.com/how-centriq-works) | Appliance/model information, manuals, maintenance information, and home digitisation. Reduces the work of identifying what the household owns. | Its current service presentation includes invitation-based San Francisco Bay Area digitisation. Older consumer-app descriptions do not establish current Philippine availability. |
| 24 | [Sortly](https://www.sortly.com/solutions/home-inventory-software/) | Photo inventory, locations, QR/barcodes, and multi-device records. Helps people locate and identify possessions. | Item identification and search are valuable, but a powerful inventory system is not automatically the simplest way to run a household's obligations. |

### General tools that are real competitors

| # | Product | Documented strength and likely human value | Boundary or lesson for Keeply |
|---|---|---|---|
| 25 | [Todoist](https://www.todoist.com/help/todoist/features/introduction-to-reminders-9PezfU) | Familiar task capture, recurring tasks, sharing, and reminders. | A household can already build a capable system here. Keeply must save meaningful setup and coordination work. Reminder options vary by platform; generic feature names do not guarantee equivalent behaviour. |
| 26 | [TickTick](https://ticktick.com/features) | Tasks, calendars, recurring reminders, shared lists, widgets, and habit functions. | Rich flexibility can satisfy experienced organisers. Keeply should win through household context and finished workflows rather than feature count. |
| 27 | [Apple Reminders](https://support.apple.com/guide/reminders/assign-shared-reminders-remnf1ce7672/mac) | Shared lists, assignment, and familiar device integration. | Low adoption friction within an Apple household is a real advantage. Cross-platform membership and specialised obligation records are the comparison points. |
| 28 | [Google Calendar](https://support.google.com/calendar/answer/6192039?co=GENIE.Platform%3DDesktop&hl=en) | Familiar shared dates and event attachments. | Dates are visible, but evidence permissions and outcome state need attention. Google's documentation notes that attaching a Drive file does not automatically grant guests access. |

### Philippine payments and finance alternatives

| # | Product | Documented strength and likely human value | Boundary or lesson for Keeply |
|---|---|---|---|
| 29 | [GCash](https://help.gcash.com/hc/en-us/articles/360020931693-How-to-schedule-bill-payments) | Bill payment and scheduled payments in an established wallet. Turns an intention into a payment action. | Funding, scheduling, transaction success, and biller posting are separate stages. Keeply can organise across channels, but must not imply that it executes or verifies payments. |
| 30 | [Maya](https://www.maya.ph/support/bills-pay) | Bill payment within a wallet and confirmation workflow. | A payment record does not automatically cover maintenance, warranty evidence, or household responsibility. Posting and confirmation details depend on the biller and channel. |
| 31 | [My Meralco / Meralco online services](https://www.meralco.com.ph/residential/help-support/frequently-asked-questions/online-payments) | Provider-specific bills, account information, payment visibility, and receipt processes. | More authoritative for that provider's account state than a manually entered reminder. A household still has many providers and non-bill obligations. |
| 32 | [Lista](https://www.lista.com.ph/personal-budgeting-app) | Locally oriented personal budgeting and savings organisation. | A relevant alternative for money organisation. The reviewed page is not sufficient to infer the presence or absence of every reminder, connection, or household feature. |
| 33 | [KKB](https://www.kaskasanbuddies.com.ph/app) | KKBills statement/due-date reminders alongside card information and promotions. | A local direct competitor for credit-card deadline organisation. Keeply needs a distinct reason to exist beyond storing another card due date. |
| 34 | [KasKas Savvy](https://apps.apple.com/us/app/kaskas-savvy/id6739750472?platform=vision) | Manual credit-card transactions, receipts, instalments, statement/due dates, and annual-fee tracking. | Its listing explicitly separates tracking from bank syncing and payment execution. That clarity is a useful trust pattern. |
| 35 | [Tarsi](https://www.tarsi.cloud/) | Locally oriented budgeting, debts, planned payments, and vendor-described offline/no-account use with optional cloud functions. | Local apps already compete on privacy, low setup, and independence from bank connections. These capabilities were not hands-on verified. |
| 36 | [Boop](https://apps.apple.com/ph/app/boop-budget-expense-tracker/id6760663354) | Local wallet categories, recurring bills, instalments, receipt OCR, and automation options described in its listing. | Local labels and semimonthly budgeting are not unique differentiators. Automation setup and extraction accuracy need testing before claiming effortless use. |
| 37 | [Agila](https://apps.apple.com/ph/app/agila-finance-coach/id6765464814?platform=mac) | Offline-oriented finance tracking, conversational input, instalments, and reminders, with a distinctive advertised voice. | Tone is a preference to investigate. Some users may enjoy a provocative coach, while others need neutral household communication. Neither preference should be assumed universal. |

### Historical case, not a current alternative

**38. Prism:** A public discussion preserves a shutdown notice naming 20 February 2024, along with reactions about bill visibility, payday timing, and the difficulty of replacing a trusted workflow. The old consumer domain now redirects to a different business. This is secondary historical evidence, not a verified explanation of why Prism closed. The lesson is that continuity and an exit path matter when users rely on an app for consequential records. [Historical discussion](https://www.reddit.com/r/personalfinance/comments/18m96s2/prism_shutting_down_any_good_alternatives/), [former Prism domain](https://www.prismmoney.com/)

**The largest competing system may be a combination:** calendar + notes + spreadsheet + wallet + photo gallery + family chat. Its advantage is familiarity and flexibility. Its cost is repeated entry, scattered proof, and one person remembering how the pieces fit together. That cost is a hypothesis supported by selected accounts, not a measured market-wide fact.

## 4. What selected reviews reveal about impact

These observations are a qualitative evidence ledger. They are not a ranked list of current bugs. Older reviews can expose a consequential interaction pattern even when the product has since changed. Developer responses are included where they materially change the interpretation.

| Evidence | Reported benefit or friction | Interpretation and important limit |
|---|---|---|
| [TimelyBills, Apple reviews](https://apps.apple.com/us/app/bill-organizer-budget-planner/id1454624499?platform=iphone&see-all=reviews), including June 2022 and March 2024 entries | Praise for simple manual bill/payment tracking; a separate reviewer describes advertising interfering with saving. | Speed and control can be valuable independently of automation. Interrupting a consequential save is especially costly. These are selected historical experiences, not a current defect audit. |
| [TimelyBills, Android listing/reviews](https://play.google.com/store/apps/details?id=in.usefulapp.timelybills) | Some reviewers describe duplicate or confusing connected-account records, alongside positive experiences. | Connection quality can undermine confidence in the overview. These reports do not verify incorrect bank transfers or establish current incidence. |
| [Chronicle, Apple reviews](https://apps.apple.com/us/app/chronicle-bill-organizer/id572561420?platform=iphone&see-all=reviews) | A historical November 2020 complaint describes automatically logged payments appearing paid. The developer explains an optional auto-log setting. | The useful lesson is status semantics and configuration visibility, not that Chronicle executed a payment incorrectly. A tracking app must make its assumptions understandable. |
| Same Chronicle review page, March 2026 entry | A purchaser reports difficulty restoring Pro access; the developer provides restoration guidance. | Payment entitlement and recovery are part of product reliability. A premium feature can feel unavailable even when a recovery path exists. |
| [BillOut, Android reviews](https://play.google.com/store/apps/details?id=com.pvveb.billout), April 2026 and other entries | Praise for recurrence and affordability; reports include widget clipping and account/key recovery trouble. | Everyday legibility and recovery can matter as much as adding functionality. The developer reports providing recovery steps. No independent retest was performed. |
| [Cozi, Apple reviews](https://apps.apple.com/us/app/cozi-family-organizer/id407108860?see-all=reviews), August 2024 entry | A reviewer describes value across a large multigenerational group and asks for selective privacy. | Household breadth and visibility can be useful, while all-or-nothing sharing can be uncomfortable. One household is not evidence of a universal household structure. |
| [FamilyWall, Apple reviews](https://apps.apple.com/us/app/familywall-family-organizer/id496889629), March 2025 entry | Appreciation for breadth alongside a timetable/briefing mismatch and interaction issues. | Features need to join up where the person expects to see them. This does not establish the current state of that integration. |
| [Sweepy, Apple reviews](https://apps.apple.com/us/app/sweepy-home-cleaning-schedule/id1498897320?see-all=reviews), August 2021 and March 2023 entries | Reviewers describe reduced decision burden and helpful structure, including personal references to neurodivergence. Setup can be tedious. | A suggested next action may be more valuable than a blank custom list. Self-reported benefit is not evidence of clinical effectiveness or suitability for every neurodivergent person. |
| [Sweepy, UK reviews](https://apps.apple.com/gb/app/sweepy-home-cleaning-schedule/id1498897320?platform=iphone&see-all=reviews), entry with year not displayed | Appreciation for understanding what needs cleaning, alongside a preference for a less childlike visual style. | A premium aesthetic and game mechanics can serve different tastes. Do not turn one taste into a universal design rule. |
| [Tody, Apple reviews](https://apps.apple.com/us/app/tody/id595339588?platform=iphone&see-all=reviews), entry with year not displayed | A reviewer requests fixed weekday scheduling; the developer explains how to use the existing capability. | Apparent missing features can be discoverability problems. Keeply should observe actual use before adding a duplicate capability. |
| [HomeZada, Apple reviews](https://apps.apple.com/us/app/homezada-mobile/id473722482?see-all=reviews), January 2022, June 2024, and December 2024 entries | Benefits include having home information available, continuity with a spouse, and a maintenance calendar. Initial recording takes effort. | Rich records can create lasting value after a substantial setup cost. An older 2016 calendar complaint on the page should not be treated as a current absence. |
| [Itemtopia, Apple reviews](https://apps.apple.com/us/app/itemtopia-inventory/id952405279?see-all=reviews), May 2025 entry | Appreciation for responsive development alongside a request for easier raw-photo export. | Retrieval and portability are part of feeling that records belong to the user. A separate older item-limit complaint cannot establish current limits; current listings describe different terms. |
| [Philippine credit-card discussion](https://www.reddit.com/r/PHCreditCards/comments/1akyjqc), February 2024 | People describe combinations of spreadsheets, finance apps, notes, and reminders. | Keeply is competing with established personal systems. This is a self-selected credit-card community, not a representative survey of households. |
| [Philippine statement/due-date discussion](https://www.reddit.com/r/PHCreditCards/comments/1s20axb/app_recommendation_for_statement_due_dates/), March 2026 | A request specifically values statement dates, due dates, and a widget; replies mention local alternatives. | Statement arrival and payment deadline are distinct moments. A single recurring date may be insufficient for some card users. Frequency of this need is unmeasured. |
| [Philippine reminder-call discussion](https://www.reddit.com/r/PHCreditCards/comments/1q817em/cc_that_doesnt_have_remind_due_date_system/), January 2026 | A user describes intrusive reminders despite having paid and difficulty receiving them in a work context. | More reminders can reduce perceived quality if state and context are wrong. The post does not establish a bank's general practice or verified account state. |
| [Philippine warranty/receipt discussion](https://www.reddit.com/r/adultingph/comments/ypit1j), November 2022 | A lost receipt complicates the user's attempt to obtain warranty help. | Keeping retrievable proof can have concrete value. This account is not a legal determination that every warranty always requires the same document. |
| [Philippine appliance-service discussion](https://www.reddit.com/r/adultingph/comments/1crctny), May 2024 | A user describes repeated service visits and retailer/manufacturer coordination difficulties. | Claim and service history can help the household explain what happened. An organising app cannot guarantee a repair, a refund, or provider responsiveness. |

### Patterns to investigate, without pretending to quantify them

**Simplicity has independent value.** Some people want manual control and a reliable overview. Automatic connections are not a universal upgrade.

**The most damaging failures create uncertainty.** Duplicated records, wrong paid states, inaccessible purchases, and missing proof can make the person rebuild a parallel system. A small visual issue becomes consequential when it hides a date or clips an action.

**Connection between features matters.** A document saved somewhere in an app is less useful if it is unavailable at the moment of a repair or household handoff. A task assigned to someone is less useful if they cannot understand what completion means.

**Discovery is part of functionality.** A feature that the user cannot find does not deliver its intended value. Before expanding Keeply, test whether people understand the useful capabilities already present.

**Tone and game mechanics are preference-dependent.** Some people enjoy encouragement, streaks, or playful competition. Others want a quiet, adult tool. Consequential household administration should work well without requiring a game.

## 5. Philippine realities that change the requirements

### 5.1 A scheduled payment is conditional

GCash's scheduling guidance describes a limit of five scheduled payments and requires sufficient funds by the stated processing time. If funds are insufficient, a scheduled payment can be cancelled and the user must pay manually. This is a documented provider workflow, not a claim about all wallets. [GCash scheduled payments](https://help.gcash.com/hc/en-us/articles/360020931693-How-to-schedule-bill-payments)

**Product consequence:** “Autopay enabled” or “scheduled” must not automatically become “paid.” A useful household record can retain a reminder to check the result. Keeply should not imply that it controls a payment schedule managed by another service.

### 5.2 A wallet transaction and biller posting are different events

GCash documents cases where payment processing and biller posting take different amounts of time. Meralco also distinguishes external-channel payment visibility from confirmation and receipt processes. The correct window depends on channel and biller, so Keeply should not apply one universal posting deadline. [GCash payment not posted or failed](https://help.gcash.com/hc/en-us/articles/30283229084185-Bills-payment-not-posted-or-failed), [Meralco online-payment FAQs](https://www.meralco.com.ph/residential/help-support/frequently-asked-questions/online-payments), [Meralco digitised official receipts](https://www.meralco.com.ph/residential/billing-payment/understanding-your-bill/digitized-official-receipt)

**Product consequence:** A screenshot or reference number is evidence of an attempted or completed channel transaction. It is not universal proof that the provider has settled the household's account. The interface can say “Recorded as paid by you” without inventing verified biller status. A provider-confirmation state would require a supported integration or explicit user confirmation, with the provenance visible.

### 5.3 Timing can matter more than the monthly average

BillOut explicitly supports totals between salary dates. Philippine forum requests also distinguish statement and due dates. These observations suggest a timing need; they do not prove that every household is paid twice a month. [BillOut listing](https://play.google.com/store/apps/details?id=com.pvveb.billout), [Philippine statement/due-date discussion](https://www.reddit.com/r/PHCreditCards/comments/1s20axb/app_recommendation_for_statement_due_dates/)

**Hypothesis:** “What is due before our next income date?” may be more actionable for some households than “average monthly obligations.” Test this using actual dates and existing records before building an income-management system. Include households with variable income and more than one income source. A partial obligation total must not be labelled “safe to spend.”

### 5.4 Warranty coverage is not always one date

LG Philippines' warranty information distinguishes product coverage, labour, and certain longer parts-only coverage. Samsung's terms also depend on product, purchase evidence, and eligibility. Model-specific details matter. [LG Philippines warranty terms](https://www.lg.com/ph/support/warranty/), [Samsung Philippines warranty terms](https://www.samsung.com/ph/support/warranty/)

**Product consequence:** One “covered until” date can be misleading. A receipt, model, serial number, retailer, applicable terms, and service history can be more useful than a confident expiry badge. Keeply can first preserve documents and notes clearly. A structured multi-part coverage feature should wait until its full editing, display, reminder, and correction flow is justified and reliable.

Do not promise that preserving a document ensures a successful warranty claim. Keeply can improve the household's preparation, not determine a manufacturer's decision.

### 5.5 Bank independence is useful, but it is not unique

International connectivity varies: YNAB's documented direct-import coverage does not include Philippine banks, while Monarch and Rocket Money define North American or US availability. Local tools already emphasise manual, offline, or locally familiar workflows. [YNAB coverage](https://support.ynab.com/en_us/my-bank-isnt-listed-HJivlLavle), [Monarch availability](https://help.monarch.com/hc/en-us/articles/19985735202068-FAQs-about-Monarch), [Rocket Money availability](https://help.rocketmoney.com/en/articles/79778-does-rocket-money-support-international-banks), [Tarsi](https://www.tarsi.cloud/)

**Product consequence:** Keeply should deliver useful results before any bank integration. The differentiator is the complete household obligation and record workflow, not simply “works without bank linking.” Connecting an account should never be assumed to solve provider posting, maintenance scheduling, or warranty retrieval.

### 5.6 Local fit requires fieldwork, not local labels alone

The following are research hypotheses, not established prevalence claims:

- A household may pay through a mixture of wallets, banking apps, counters, and another household member.
- The person paying may differ from the person checking the due date or keeping the receipt.
- English, Filipino, Taglish, or another language may be preferred for different interactions.
- Mobile access may dominate, but available devices and connection quality can vary within one home.
- An owner, renter, adult child, partner, or relative may have different record responsibilities.

Validate these by observing real household systems. Do not assume a single household structure, a single language preference, or that every household wants shared financial visibility.

## 6. The market gaps Keeply can credibly pursue

### Gap A: Reliable closure across different obligation types

Bill reminders are strong at dates. Ledgers are strong at money records. Inventory apps are strong at belongings. Family tools are strong at visibility and coordination. Several products already bridge these categories, but the integration creates difficult design questions.

Keeply's opportunity is a coherent cycle:

**Capture → understand and prepare → act → record the outcome and proof → establish the next correct cycle → retrieve or hand off.**

This is a proposed experience standard, not a claim that no competitor offers any part of it.

### Gap B: Honest uncertainty

The product must preserve distinctions that real life makes:

| Distinction | Why collapsing it is harmful |
|---|---|
| Unknown amount vs ₱0 | A zero suggests no cost; an unknown means the forecast is incomplete. |
| Estimated amount vs confirmed amount | A plan should not look like an actual bill. |
| Amount confirmed vs payment confirmed | Knowing the bill does not settle it. |
| Reminder snoozed vs deadline changed | A postponed alert does not extend a provider's deadline. |
| Payment scheduled vs payment executed | Funding and provider conditions can prevent execution. |
| User-recorded payment vs provider-posted payment | Each has a different source of truth. |
| Maintenance due by a calendar rule vs due after the last service | An early or late service changes only some schedules. |
| Warranty date vs claim eligibility | Documents, exclusions, and component coverage still matter. |
| Skipped occurrence vs completed work | History and future planning should not imply work happened. |
| No saved overdue records vs no household problems | The app only knows what has been recorded. |

A premium product makes these distinctions understandable without forcing the user to learn accounting or workflow jargon.

### Gap C: Context that makes another person capable

Sharing should answer who owns the next action, what the other person needs to know, and what counts as completion. It also needs invitation, acceptance, access control, member departure, and recovery. A shared login or a forwarded alert does not provide the whole experience.

**Strategic caution:** Shared responsibility is potentially central to the category, but it is a substantial product and data-access project. Do not add a superficial assignment field and market shared household management before the full lifecycle works.

### Gap D: Recovery after real life interrupts

People will save incomplete information, miss dates, pay late, replace an appliance, upload the wrong document, and return after weeks away. Recovery should be a normal part of the product, with reversible corrections and understandable history.

The aim is to help the person re-establish control. Avoid turning every past occurrence into a permanent demand for attention. Test how old records should be confirmed, skipped, or corrected while keeping truthful history.

### Gap E: Trustworthy restraint

The strongest product may deliberately avoid becoming a bank, a full budgeting system, a social feed, or a universal assistant. Each extra capability has reliability, permissions, support, and explanation costs.

Keeply can be comprehensive for a defined job: **organising household obligations and their records**. “Answers it all” should describe the completeness of this experience, not promise to solve affordability, provider disputes, every family relationship, or every financial decision.

## 7. Keeply's current foundation and the actual gaps

This section reflects source and documentation inspection. It is not a claim that all flows have been verified on the deployed service or on real devices. Public-page changes occurring elsewhere in the workspace were not part of this research.

| Area | Repository observation | What this research recommends |
|---|---|---|
| Initial capture | The dashboard supports starting with an item name and adding details gradually. The sample-account CTA already uses the required wording. [Dashboard source](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/components/dashboard.tsx) | Preserve the low-friction start. Test whether people understand what they can leave unknown and return to later. |
| Household categories | Bills, maintenance, and purchases already lead the category structure. [Categories](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/features/templates/categories.ts) | Preserve identifiers and saved records. Use category-specific language and examples without multiplying forms. |
| Main overview | Calendar is the established default, with a list alternative and upcoming/attention sections. [Dashboard](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/components/dashboard.tsx) | Test whether the next important action is clear. Do not assume research justifies replacing the default calendar. |
| Reassurance copy | The attention section can say “You're all caught up. No overdue reminders.” | Qualify reassurance to the records Keeply knows about. Test whether incomplete or unconfirmed records make this message misleading. This is a recommendation, not an implemented change. |
| Amount confidence | Planning distinguishes confirmed, estimated, unverified, and unset amounts. [Planning](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/features/items/planning.ts) | Make these distinctions legible in summaries and actions. Confirmed cost must never imply payment. |
| Outcome history | Activity types include payments, service, repair, renewal, completion, notes, and warranty closure, with amounts, documents, and corrections. [Activity model](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/features/items/activity.ts) | This is a substantial foundation. Observe whether people can record an outcome and later understand it without support. |
| Occurrence lifecycle | Records distinguish open, completed, superseded, unconfirmed, and skipped occurrences. [Domain model](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/features/items/domain.ts) | Translate internal states into clear household language. Test re-opening and correction against recurrence and planning. |
| Recurrence | Activity handling distinguishes fixed schedules, schedules from completion, manual handling, and stopping. [Activity actions](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/features/items/activity-actions.ts) | Verify early/late completion, backdated entries, skipped cycles, end-of-month, and correction. These edge cases protect confidence. |
| Snooze | Documentation separates snooze from the obligation date. Manual calendar-export functionality was removed under the product quality standard. [Snooze and calendar notes](/Users/giancabrera/Documents/Hosted-Sites/keeply/docs/SNOOZE_AND_CALENDAR.md) | Preserve that distinction. Do not revive download-and-import workarounds as a premium convenience. |
| Future visibility | The outlook documentation describes 30/90/365-day planning, amount uncertainty, and scope constraints. [Household outlook](/Users/giancabrera/Documents/Hosted-Sites/keeply/docs/household-outlook.md) | Test comprehension and missing-cost visibility. Avoid a safe-to-spend or complete-budget claim. |
| Household sharing | Private owner-based records are present; no complete shared-household flow was established in the reviewed material. | Treat sharing as a substantial gap requiring a full product, access-control, and lifecycle design. Do not imply it exists today. |
| Warranty scope | Repository documentation describes one warranty per receipt and no automated transfer/renewal or OCR. [README](/Users/giancabrera/Documents/Hosted-Sites/keeply/README.md) | First make existing proof and notes easy to retain and retrieve. Validate demand before introducing structured component coverage or extraction. |
| Privacy and alerts | The privacy page describes private data, attachment access, service providers, notification content, and no enabled SMS feature. [Privacy source](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/app/privacy/page.tsx) | Confirm that the actual deployment matches the policy. Offer only supported channels. Consider how much household detail belongs on a visible notification. |
| Offline access and portability | Complete offline behaviour and a user self-service export were not established in this review. | Do not advertise either as verified. Investigate whether users need a dependable retrieval/exit path and what can be completed reliably. |
| Premium | Source lists prepaid 30-day access at ₱59 and annual access at ₱499. [Products](/Users/giancabrera/Documents/Hosted-Sites/keeply/src/features/premium/products.ts) | These are configured prices, not evidence of willingness to pay, conversion, or sustainable margins. Test real purchase behaviour and retention. |

Keeply's existing breadth means that the highest-return work may be understanding, reliability, and completion of the current experience. This research does not justify a wholesale feature expansion.

### Platform reality must remain part of the promise

Web push on iOS depends on supported versions and a home-screen web app, with permission requested through a user action. Focus and system settings also affect what the person sees. WebKit's later declarative-push material does not remove the need to verify the supported installation and delivery flow. [WebKit web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [WebKit declarative web push](https://webkit.org/blog/16535/meet-declarative-web-push/)

A server or push service accepting a message is not proof that the user saw it. Before offering a channel, verify installation, consent, cancellation, denied permission, revoked permission, background delivery, and recovery on the environments where it is offered. This report does not establish those acceptance results.

## 8. Three complete experiences to design and test

These are proposed standards for testing the product. They are not descriptions of fully implemented capabilities.

### A bill, from arrival to a trustworthy record

1. **Capture:** Save the provider and obligation quickly. Allow an unknown amount or date. Do not infer a future amount from a previous bill without identifying it as an estimate.
2. **Prepare:** Make the date, amount confidence, and necessary next action visible. If someone else will handle it, provide the required context through a verified sharing flow.
3. **Act:** The person pays using their chosen supported channel. If Keeply links to a provider, the destination and handoff must work on the offered devices. Recording an action must never imply Keeply moved money.
4. **Record:** Capture the amount, date, reference, or proof as appropriate. Clearly distinguish a user record from independently verified status. Let the person save without fabricating unavailable details.
5. **Handle uncertainty:** If confirmation is pending, retain the unresolved part. If payment failed, an upload failed, or the user cancels, preserve the prior state and provide a clear next step.
6. **Continue:** Establish the next appropriate occurrence, flag unknown future amounts, and prevent accidental double completion.
7. **Retrieve:** Later, the person can find what they recorded and understand its source. Corrections preserve a truthful history and update projections appropriately.

**Critical test:** Can the user explain what the paid indicator proves and what it does not prove?

### A maintenance task, from noticing to the next service

1. **Capture:** Identify the appliance or home task. The initial entry should not require a full inventory.
2. **Prepare:** Retrieve the previous service, provider, notes, cost, and access instructions where available. A suggested schedule must be identified as a suggestion and appropriate to the item.
3. **Arrange:** Record the practical next step. Booking a service is not the same as completing the work.
4. **Complete:** Record what happened, actual service date, amount if known, and proof. If a visit did not fix the issue, the history should not imply successful resolution.
5. **Continue:** For a schedule based on completion, calculate from the actual relevant service date. For a fixed schedule, preserve its intended rule. Let the person correct a mistaken completion.
6. **Handle disruption:** If the provider cancels, the task is skipped, or the appliance is replaced, the record should remain understandable and avoid irrelevant future reminders.

**Critical test:** Can the household distinguish “we contacted someone,” “someone visited,” and “the maintenance was completed” without an elaborate new workflow?

### A warranty, from purchase to a service claim

1. **Capture:** Save the purchase proof and enough information to identify the item. Retain the original source where practical and permitted.
2. **Clarify:** Separate an entered date from verified coverage terms. Keep model-specific information available. Do not represent longer parts-only cover as full cover.
3. **Prepare:** At an appropriate moment, show the useful action, such as reviewing the terms or checking a developing problem. Avoid making every expiry a crisis.
4. **Use:** Find the receipt, model, serial number, retailer, service contacts, and past attempts quickly.
5. **Record:** Keep the claim or service outcome. A submitted claim is not an approved claim; a visit is not necessarily a repaired appliance.
6. **Close or continue:** Preserve history after expiry, replacement, or resolution, with appropriate control over archival and deletion.

**Critical test:** Can a person retrieve the correct proof on their phone during a real service interaction, and can another authorised member do the same?

## 9. Who to win first

These are proposed recruitment segments, not validated personas or market-size estimates.

| Segment | Immediate job | Reason to try Keeply | Adoption risk to investigate |
|---|---|---|---|
| The primary household organiser | Stop tracking everything mentally and across several tools. | A coherent view and reliable records. | Setup creates more administrative work than it removes. |
| A couple or small family with split responsibilities | Know who handles each obligation and what happened. | Less chasing and fewer repeated questions. | Only one member participates; privacy expectations differ. |
| An appliance-owning household | Find purchase proof and service history when needed. | Concrete retrieval value during a repair or claim. | Usage is infrequent; initial digitisation feels burdensome. |
| A household with tight or variable timing | Understand upcoming obligations without pretending that money is available. | Clear dates, partial information, and respectful recovery. | The app confuses remembering with affordability or adds shame. |

**Recommended initial wedge:** The household organiser who already has bills, at least one recurring maintenance responsibility, and purchase proof they want to keep. This tests the combined job across the three core categories. It avoids trying to serve every budgeting, inventory, and family-calendar need at launch.

Single-person households remain valid users. Shared functionality should expand useful responsibility without making a solo user complete household setup first.

## 10. Priorities and premium value

The order below is a reasoned product recommendation, not a statistical ranking of demand.

### First: establish trust in the existing core

- Audit recurrence, corrections, unknown/estimated amounts, saved proof, and return-after-absence behaviour.
- Make the next action and the recorded outcome understandable at the point of use.
- Confirm notification-channel availability and recovery on real devices and providers.
- Test whether reassurance reflects only known records and whether incomplete items remain visible appropriately.
- Make cancellation and error states preserve user work without producing false completion.

These changes should be driven by observed problems. Do not add a separate “trust dashboard” or another layer of setup simply to make this checklist visible.

### Next: improve capture and closure where observation shows friction

Observe people using name-first capture, adding proof, recording service, and checking future obligations. Simplify language, navigation, and progressive disclosure before introducing a new assistant. Preserve the existing calendar default unless comparative use gives a reason to change it.

If people repeatedly ask what is due before an income date, prototype a bounded view using existing obligations. Disclose missing amounts. Do not expand into a full budget or account-balance product without separate evidence.

### Then: validate and deliver complete household sharing

The minimum complete project includes:

- A clear household and membership model, with solo use still working.
- Invitations, acceptance, decline, expiry, and recovery.
- Understandable record visibility and attachment permissions.
- Responsibility that the assigned person can see and act on.
- Clear history of consequential changes, correction, and concurrent edits.
- Member removal, departure, ownership continuity, and revoked access.
- Notifications that reach the appropriate person without duplicating noise.

Prototype the experience and permissions first. Implement only when the full flow can be delivered and verified. Do not expose unsupported collaboration actions during a partial rollout.

### Later, and only with evidence

Receipt OCR, email ingestion, automatic bill extraction, provider connections, richer warranty modelling, and offline access may help. Each can also introduce silent errors, privacy concerns, or operational costs. They should earn their place through a demonstrated problem and a complete supported flow.

For extraction, verify the source, detected fields, review and correction, duplicate handling, ambiguous dates, failed uploads, and saved outcome. For provider integrations, verify access, expiry, reconnection, stale data, timing, and withdrawal. A demonstration or successful API call is insufficient.

### What premium should mean

Premium should buy greater depth, convenience, and continuity within a trustworthy core. Candidate value to validate includes longer planning, richer usable history, and complete collaboration. This is not a recommendation to change existing entitlements immediately.

Do not remove access to already entrusted proof as a surprise upgrade tactic. Explain what happens at expiry. Test restoration and renewal as carefully as purchase. Avoid monetising through interruptions at the moment a person saves a payment or service record.

Current source pricing is ₱59 for 30 days and ₱499 for a year, with prepaid access. Evaluate those prices through real choices, cancellation reasons, support cost, payment cost, storage use, and renewal behaviour. A small number of enthusiastic interviews is not willingness-to-pay evidence.

Do not promise lifetime service without understanding ongoing storage, notification, support, and provider costs. Prism's historical closure is a continuity lesson, not proof that a particular pricing model succeeds or fails.

## 11. Research that should happen before the next large build

### Phase 1: observe 18 to 24 households

This is a proposed qualitative sample, sufficient for discovering patterns across selected situations but not estimating national prevalence. Recruit beyond existing enthusiastic users.

Include solo and shared households, owners and renters, different levels of financial comfort, fixed and variable income, Android and iPhone users, and people using paper or spreadsheets as well as apps. Include people who tried and abandoned an organiser. These are recruitment dimensions, not quotas that a small study can fully cross.

Where participants consent, interview another household member separately. This helps reveal differences between “I shared the system” and “the other person can use it independently.” Avoid labelling one gender as the default administrator.

Use recent concrete examples:

1. Show how the last utility bill arrived and how you knew what to do.
2. Walk through the last time a payment or reminder went wrong.
3. Find the proof for a payment made a month or more ago.
4. Explain the last appliance service, including who noticed, arranged, paid, and checked it.
5. Find the receipt and terms for an appliance you might need repaired.
6. Describe what another person could handle if you were unavailable for two weeks.
7. Show what you stopped using and explain the moment it became unhelpful.
8. Explain which records you would and would not share.

Observe the search and handoff rather than asking only whether someone wants a feature. Do not require account numbers, credentials, unredacted statements, or private documents to be retained by researchers. Use consented observation and redacted examples.

Record the existing tools, number of handoffs, unresolved questions, re-entry, corrections, and time to find relevant information. Separate an app's problem from lack of funds, provider delay, unclear coverage, or household disagreement.

### Phase 2: test the three core journeys with prototypes

Run moderated sessions around bills, maintenance, and warranties. Start with realistic incomplete information. Include cancellation, wrong entry, failed upload, missed date, and return after a gap.

Watch for independent understanding. Can the person explain an estimate, a recorded payment, and the next cycle? Can they locate proof without remembering which screen they used? Does an assigned member know what to do without being coached by the organiser?

Compare the improved journey with the household's existing system. A polished prototype is not a success if it adds more steps than notes and a photo.

### Phase 3: a 6 to 8 week pilot, followed by a later check

Use real supported devices and the live service. Several bill cycles and maintenance interactions may occur during this period, but annual warranty value cannot be established in a short pilot. Conduct a roughly 90-day follow-up for continuity and return behaviour where feasible.

Track baseline and outcome cautiously. Self-reported relief is useful but subject to novelty, expectation, and selection effects. Avoid causal mental-health claims from a small uncontrolled pilot.

### Metrics that reflect the job

| Metric | Operational definition | Interpretation safeguard |
|---|---|---|
| First useful setup | A participant saves a real obligation, understands its status, and can find it later without help. | Do not count an empty account or a demo visit as activation. |
| Successful obligation cycle | A due occurrence is acted on or deliberately resolved, its outcome is understandable, and its next state is correct. | Count deliberate skips separately from completed work. |
| Missed known obligations | Obligations recorded before their deadlines that the household says it missed, divided by eligible recorded obligations. | The denominator excludes unrecorded duties and cannot establish all household misses. |
| Proof retrieval | Success and elapsed time retrieving the right evidence in a realistic task. | Accuracy matters more than fast retrieval of the wrong file. |
| Rechecking burden | Frequency and reason for checking another source solely to confirm Keeply's record or status. | Some provider checks are necessary; distinguish them from product-induced distrust. |
| Independent household participation | A second member can act and record the result without organiser prompting. | Invitation acceptance alone is insufficient. |
| Notification quality | Useful action, dismissed/irrelevant alerts, duplicates, and confirmed delivery failures. | Provider acceptance is not user-visible delivery; avoid claiming complete observability. |
| Recovery success | Correct return after missed cycles, failed actions, or mistaken entries. | A tidy overview must not hide unresolved obligations. |
| Return at the next relevant moment | The person uses Keeply when the next bill, service, or proof need occurs. | Low daily activity can coexist with strong value. |
| Paid continuity | Actual purchase, renewal, expiry experience, cancellation reason, and support burden. | Paid conversion alone does not establish retention or profitability. |

Set numeric launch thresholds after a baseline and a technical risk review. Any targets chosen now would be proposed acceptance criteria, not industry benchmarks. Reliability standards should be explicit before exposing a feature, especially where a wrong status or lost record creates consequential harm.

### A practical 90-day sequence

| Period | Main work | Decision produced |
|---|---|---|
| Days 1 to 21 | Interviews, artifact walkthroughs, and core-flow reliability review. | Which problems are frequent and consequential enough to solve first? |
| Days 22 to 45 | Prototype and refine capture, action, proof, and recovery. Validate current-feature discoverability. | Can the improved journey beat the household's existing system? |
| Days 46 to 70 | Implement only validated, fully supportable improvements; complete device/provider acceptance. Prototype sharing if evidence warrants it. | Which flows are ready to offer, and where must availability remain restricted? |
| Days 71 to 90 | Pilot review, purchase/expiry observation, and prioritisation. Continue longer follow-up as needed. | Is there durable value, and is sharing or another major project the next justified investment? |

This is a planning sequence, not an estimate that every collaboration or integration project fits in 90 days.

## 12. Positioning and the decisions to make now

Use **Keeply** as the brand. Describe the audience and jurisdiction where needed in guides, research, and local provider information. General marketing can focus on the household job.

Suggested positioning to test:

> Keep your household organised.
>
> Bring bills, home maintenance, and purchase records together, so you can see what needs attention and find what was done.

General demo CTA: **Explore a sample account**.

This wording avoids promising verified payment status, guaranteed savings, successful warranty claims, or prevention of every missed obligation. Shared-household claims should wait for a complete verified sharing experience. Localisation should be demonstrated through useful provider context and real workflows, rather than a geographic suffix on the brand.

Make five decisions now:

1. Define success around a complete obligation cycle, not the number of reminders sent.
2. Protect truthful status and uncertainty as core product quality.
3. Improve the existing capture, outcome, proof, and recovery flows before expanding feature breadth.
4. Validate shared responsibility as the next substantial product project, with privacy and the full membership lifecycle included.
5. Measure relief, retrieval, independent participation, return at the next relevant moment, and paid continuity through fieldwork.

**The central opportunity:** Become the household's dependable place to know what needs attention, understand the next step, and retain the record of what happened. That is a focused, demanding version of being the one answer.

## Source and verification notes

- Links near claims are the source register. Official product documentation supports described capabilities; app reviews and community posts support only the reported experiences attributed to them.
- Peer-reviewed findings are presented with their sample and inference limitations. No study reviewed establishes Keeply's effectiveness.
- No country-wide adoption percentage, market size, review sentiment percentage, clinical benefit, competitor reliability score, or willingness-to-pay estimate is asserted.
- Prices from other products were intentionally not compared as if directly equivalent across countries, platforms, promotions, and included services.
- BSP material was located during discovery but not used for numerical claims because the full relevant report was not successfully inspected.
- Some official pages describe services that have evolved substantially, especially Centriq and the former Prism domain. Current positioning was distinguished from historical consumer descriptions.
- This work added only this research document. No application functionality was changed or deployed as part of this research. Application tests, Lighthouse, authenticated deployed-flow checks, and competitor hands-on testing were not performed because this deliverable is a research report.
