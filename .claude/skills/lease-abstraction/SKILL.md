---
name: lease-abstraction
description: "ALWAYS use this when extracting key terms from a lease at Aloe Property Management — pulling parties, dates, rent, deposit, renewal clauses, responsibilities, fees, and special terms into structured data with source quotes. Use when Ivy needs lease data for a new tenancy or Rex needs to understand what's in a lease before drafting a renewal. Extract, do not interpret. The abstraction is a draft until Randi confirms it."
---

# Lease Abstraction — Aloe Property Management (Ivy + Rex)

Ivy uses this skill when setting up a new lease. Rex uses this skill before drafting a renewal to confirm exactly what the current lease says. For every field, capture the value plus a short quote or section reference so Randi can verify the source. Read and structure only — never invent a value, never interpret legal meaning.

---

## Hard Gate

Lease abstraction is extract-don't-interpret. Pull what the lease says; do not decide what a clause legally means and never fill a blank with an assumed default. The abstraction is a draft until Randi confirms it. Legal-meaning questions route to Randi. This is not legal advice.

---

## Inputs

- The lease file (PDF or document) from Rentvine or the Leases/ folder in Google Drive
- Any amendment or addendum attached to the lease
- Prior abstraction if available (for renewals, compare to the current version)

---

## Fields to Extract

| Field | Notes |
|-------|-------|
| Parties | Landlord name, all tenant names (every adult 18+ on the lease) |
| Property address | Full address including unit |
| Lease term | Start date, end date, total months |
| Monthly rent | Amount and due date |
| Rent escalation | Any scheduled increases — amount and timing |
| Security deposit | Amount, refundable vs. non-refundable portions |
| Admin fee | Amount — standard $250 |
| Cleaning fee | Amount — standard $500 non-refundable |
| Pet | Approved pets listed, pet fee amount ($500 non-refundable per pet) |
| RBP | Resident Benefit Package amount ($15/mo) |
| Renewal clause | Auto-renew vs. notice required, notice period |
| Notice to vacate | Required notice days from tenant |
| Lease break terms | Fee amount, notice required, process |
| Tenant responsibilities | Landscaping, utilities, HVAC filters, pest control |
| Owner/landlord responsibilities | Repairs, maintenance obligations |
| HOA | Whether HOA applies, tenant registration required |
| Special terms | Any non-standard clauses, addenda, side agreements |
| NSF fee | Amount — standard $75 |

---

## Workflow

1. Read the full lease and all attachments before extracting anything.
2. For each field, capture the value plus a short quote or section reference.
3. Mark any missing field as `not-found` — never infer a default.
4. Quote ambiguous clauses instead of picking a reading.
5. Surface both sides of any internal contradiction.
6. Flag low-confidence reads from scans or handwritten edits.
7. For renewals (Rex): note any clause that changes at renewal, and flag anything that needs owner or Randi decision before the new term is set.
8. Assemble the structured abstraction with a flag list.
9. Route to Randi to confirm before treating it as authoritative.

---

## Aloe Standard Terms Reference

Use these to flag deviations — do not assume them if they are not in the lease:

| Item | Aloe Standard |
|------|--------------|
| Admin fee | $250 non-refundable |
| Cleaning fee | $500 non-refundable |
| Pet fee | $500 non-refundable per pet |
| RBP | $15/mo |
| NSF fee | $75 |
| Lease break (current) | 2 months rent + $250 admin fee, 30 days notice |
| Tenant renewal fee | $150 |
| Income standard | 2.5x NET monthly rent |

If a lease term differs from the Aloe standard, flag it explicitly.

---

## Output Contract

Return:
- Structured field table: value plus source quote or section reference per field
- Not-found fields explicitly marked
- Deviations from Aloe standard terms flagged
- Ambiguous clauses with quoted text and competing readings
- Internal contradictions with both sides shown
- Low-confidence reads flagged
- For renewals: clauses that change at renewal and items needing Randi's decision
- Confirmation request marked `APPROVAL REQUIRED — confirm before treating as authoritative`

---

## Validation

- Every populated field has a value and a source quote or reference.
- No blank was filled with an inferred default.
- Ambiguous and contradictory clauses are quoted, not resolved.
- No clause was interpreted for legal meaning.
- Deviations from Aloe standard terms are flagged.
- Empty and flagged beats full and wrong.
