---
name: fair-housing-guard
description: "ALWAYS use this as the pre-send compliance pass for anything touching an applicant or resident at Aloe Property Management — a draft message, listing copy, screening criterion, renewal offer, or leasing decision. Flags protected-class language, steering, inconsistent treatment, and disparate-impact risk, and proposes compliant rewrites. Ivy runs this on all applicant-facing comms and screening criteria. Rex runs this on all renewal offers and resident-facing messages. Advisory only — surfaces risks for Randi, never sends. Not legal advice."
---

# Fair Housing Guard — Aloe Property Management (Ivy + Rex)

Ivy runs this before any applicant-facing message, listing copy, or screening criterion goes out. Rex runs this before any renewal offer or resident-facing message goes out. It reads the full item in context, flags risk, explains why, and proposes a compliant rewrite. It surfaces; it never sends.

---

## Hard Gate

This skill is advisory and is not legal advice. It surfaces risks for Randi to judge — it never sends anything and never makes a legal determination. Anything needing legal judgment, disparate-impact analysis, criminal-history policy, or an unusual decline routes to Randi. A human confirms the applicable protected-class rule set before anything goes out.

---

## Protected Classes

### Federal (always applies)
Race, color, national origin, religion, sex, familial status, disability.

### Arizona additions
Arizona law adds: **age** (40+), **ancestry** — confirm with Randi that the full current AZ list applies before any item goes out.

### Never a basis for any leasing or renewal decision
- Familial status (children, pregnancy)
- Source of income / voucher status (apply the 2.5x NET standard equally to all lawful income sources including Section 8 vouchers — the qualifying income is 2.5x the tenant's portion, minimum $1,500)
- Service animals and ESAs are not pets — never apply the pet fee or pet policy to them

---

## What to Scan

Run every item against these five categories:

1. **Protected-class language** — explicit mentions or soft phrasing
   - Examples to flag: "perfect for a young professional," "great family neighborhood," "quiet community," "ideal for a couple"
   - These describe the kind of person, not the property — rewrite to features and facts
2. **Steering** — language that directs or discourages certain applicants toward or away from a property
3. **Inconsistent treatment** — criteria, process, or tone applied differently to different applicants
4. **Disparate-impact risk** — a neutral-seeming policy that disproportionately excludes a protected class; route to Randi for legal judgment
5. **Unsafe phrasing generally** — anything that could be read as a preference, limitation, or discrimination

---

## Screening Criteria Check (Ivy)

When reviewing screening criteria, confirm:
- Income is calculated as 2.5x NET for all applicants equally, including voucher holders (2.5x the tenant's portion, min $1,500)
- Credit threshold (550) is applied uniformly
- Criminal-history factors are flagged for Randi — never scored automatically
- No criterion is a proxy for a protected class
- The same rubric is applied to every applicant on the unit

---

## Renewal Offer Check (Rex)

When reviewing a renewal offer or resident-facing renewal message, confirm:
- Rent proposal is based on market data and payment history, not personal characteristics
- The $150 renewal fee is applied consistently to all renewing tenants
- Non-renewal recommendations are based on documented lease performance only
- Language describes the lease terms and facts, not the resident's personal characteristics

---

## Workflow

1. Read the full item in context.
2. Scan against the five categories above.
3. For each hit, record:
   - Exact text flagged
   - Category
   - Risk and why
   - Severity: `critical` / `high` / `medium` / `low`
4. Propose a compliant rewrite that keeps the legitimate intent — describe features and objective criteria, never the kind of person.
5. Route anything needing legal judgment (disparate impact, criminal-history policy, unusual decline) to Randi.
6. Surface findings and rewrites. Do not send.

---

## Severity Reference

| Severity | Example |
|----------|---------|
| `critical` | Explicit protected-class language; denying a voucher holder on voucher status alone |
| `high` | Soft phrasing implying a preferred tenant type; inconsistent criteria application |
| `medium` | Ambiguous phrasing that could be read as steering |
| `low` | Watch item; rewrite recommended but low risk |

---

## What Good Output Looks Like

- Per-flag table: exact text, category, risk, severity
- Proposed compliant rewrite for each flag
- Screening criteria confirmed as uniformly applied (Ivy)
- Renewal offer confirmed as performance-based only (Rex)
- Items needing legal judgment flagged for Randi
- Overall advisory verdict with the reminder this is not legal advice
- Confirmation that the applicable protected-class rule set was confirmed by Randi

---

## This Skill NEVER

- **Never sends anything** — advisory output only.
- **Never makes a legal determination** on disparate impact, criminal history, or fair housing liability.
- **Never discounts a lawful income source** including Section 8 vouchers.
- **Never applies the pet policy to service animals or ESAs.**
- **Never varies the screening rubric or renewal terms by protected class.**
- **Never approves an item for send** — that decision belongs to Randi.
