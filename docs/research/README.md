# Keeply user research and product decisions

Updated 20 October 2026.

## Purpose

Use this folder when deciding how to improve Keeply. The owner wants improvements to move the product closer to realistic user needs, informed by household psychology and actual feedback.

The initial audience is Philippine households managing bills, home maintenance, and purchases/warranties. General marketing uses the brand Keeply.

The product should help a household answer:

1. What needs attention?
2. What do we need to do next?
3. Who is handling it?
4. Has it actually been handled?
5. Where is the proof, and what happens next time?

## Saved research

- [Deep household-admin psychology and market research, 12 October 2026](2026-10-household-admin-psychology-and-market.md): review of 37 current products/services and one historical case, psychological studies, selected reviews, Philippine payment and warranty workflows, Keeply source observations, and a proposed validation plan.
- [Standing repository instructions](../../AGENTS.md): require consulting this index for material product, workflow, positioning, and Free/Premium improvement decisions.

The deep report is a dated baseline. It is desk research, with sources and limitations recorded. Its competitor observations and source-code audit may become outdated. Preserve it and record dated corrections or new findings here, with links to supporting material.

## Principles for improvement

- Reduce the effort of remembering, interpreting, coordinating, checking, and retrieving household information.
- Make the next action and the recorded outcome clear.
- Preserve uncertainty: unknown is different from zero, estimated is different from confirmed, and user-recorded payment is different from provider settlement.
- Keep capture manageable and make corrections and return after absence straightforward.
- Respect attention, privacy, and household boundaries. Avoid shame and unsupported reassurance.
- Prioritise dependable existing flows and complete supported experiences.
- Evaluate paid value through useful outcomes and actual purchasing behaviour. Review the current entitlement implementation before recommending Free/Premium changes.

## How to use evidence

Identify the evidence type explicitly:

| Type | Appropriate use |
|---|---|
| Direct Keeply feedback or observed behaviour | Establish a concrete experience in its context. Record the task, environment, and observed outcome. |
| Published psychological research | Explain possible mechanisms, with the study's limitations and population in mind. |
| Competitor documentation | Establish a documented capability or constraint at a particular date. |
| Public reviews and community accounts | Discover possible needs or failures to investigate. Do not infer prevalence. |
| Owner direction | Set product goals and constraints. Keep it distinct from customer research. |
| Assistant assessment or hypothesis | Propose a testable interpretation. Do not present it as demonstrated demand. |

The baseline report does not establish Keeply's effectiveness, willingness to pay, or clinical benefits. The provisional ratings given in conversation are assistant judgements, not user-study results. Assess new evidence for relevance and quality; one report does not automatically describe all households.

## Improvement decision record

For a material change, add a dated entry here or link a separate research note. Keep the record concise:

1. **Problem and context:** who struggled, with which obligation and task?
2. **Evidence:** source, date, evidence type, and relevant device/environment. Separate observation from interpretation.
3. **Decision:** the change, simplification, or investigation chosen, with the reasoning.
4. **Expected outcome:** what becomes easier, clearer, or more reliable for the household?
5. **Validation:** how it was checked, actual results, and remaining uncertainty. Include success, cancellation, errors, and relevant platform differences when applicable.
6. **Follow-up:** what evidence would support keeping, revising, or reversing the decision?

Record feedback without names, account numbers, credentials, unredacted receipts, or other household-sensitive information. Link only appropriately redacted supporting material.

## Recorded direction and findings

### 20 October 2026: reuse the expected amount during completion

**Problem and evidence:** direct owner feedback reported that recording completion left the amount blank despite an amount already configured. Source inspection confirmed that the completion editor only loaded an existing activity's actual amount and ignored the schedule and date-specific expected amount. No device or customer-study context was supplied.

**Decision:** prefill new occurrence completions with the effective expected amount, prioritising a date-specific override over the saved schedule amount. Show the expected amount and identify estimates, asking the person to confirm or adjust the actual payment before saving. Preserve zero, explicit unknown overrides, clearing to unknown, and existing activity corrections. Independent activities retain their own optional cost. This follows the baseline's distinction between expected costs and recorded payments.

**Expected outcome:** avoid retyping a known amount and accidental blank cost records while keeping the person in control of the actual amount recorded.

**Validation:** 352 unit tests, type checking, lint, a production build, and 242 isolated database integration tests passed. Production browser checks passed in Chromium at 1280px and 390px and WebKit at 390px, covering saved defaults, date overrides, zero, explicit unknown, clearing, cancellation, failed-save retention and retry, and persisted actual amounts. Existing payment/service flows and rendered public/private indexing smoke checks also passed. These use local Auth/REST stand-ins and isolated PostgreSQL; hosted Supabase and physical devices remain unverified. An initial development-mode run timed out waiting for a development-overlay request; the production run completed without browser errors.

**Follow-up:** observe whether people understand and adjust the prefilled amount when their actual payment differs. Reduced effort and fewer accidental blanks remain expected outcomes, not validated household-study results.

### 12 October 2026: research baseline preserved

**Evidence type:** desk research and repository observations.

The full report is saved at the link above. Its central recommendation is to connect capture, preparation, action, outcome/proof, the next correct cycle, and retrieval or handoff. Shared household responsibility is a substantial hypothesis to validate. Existing features should be observed and improved before expanding scope.

**Validation status:** no direct target-household study was conducted as part of this research. Proposed interviews and pilots remain proposals. Public sample inspection and source review do not establish authenticated production reliability or real-device delivery.

### 12 October 2026: owner's standing improvement goal

**Evidence type:** explicit owner direction in this conversation.

Keep the deep research available and use realistic feedback and psychology to guide future improvements towards what users need. Repository instructions now make this research discoverable in future work within this checkout. Future product decisions should update this record as evidence accumulates.
