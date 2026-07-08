---
name: ar-rent-posting
description: "Review rent posting, payment application, and delinquency-feed preparation in Rentvine. Use when Bo needs to reconcile resident ledgers, identify short balances, or prepare the data feed for the delinquency workflow. Read/compute only — no ledger adjustments without Randi's approval."
---

# AR / Rent Posting

Bo uses this skill to verify rent charges, payments, credits, and short balances in Rentvine. It produces facts and drafts. It does not post ledger adjustments without approval.

---

## Hard Gate

Posting, reversing, waiving, crediting, or adjusting any ledger entry requires Randi's approval.

If the output requires a ledger change:
1. Draft the exact adjustment with source support.
2. Surface the draft to Randi with the specific approval needed.
3. Block further action until the approval lands.

---

## Inputs (Rentvine)

- Active lease export: `GET /leases/export?primaryLeaseStatusIDs[]=2`
  - **Always filter by statusID — never pull unfiltered leases**
- Resident ledger details via Rentvine MCP tools
- Payment application records
- Prior delinquency-feed output if available

---

## GL Context

Charges that commonly appear on resident ledgers:

| GL | Charge Type |
|----|------------|
| 14 | Late Fees |
| 40 / 148 | RBP ($15/mo) |
| 57 | Five Day Notice Fees |
| 58 | Admin Fees |
| 62 | Lease Break Fees |
| 94 | Placement / Onboarding Fees |

---

## Workflow

1. Confirm the source date, property set, and export scope.
2. Pull active leases with `primaryLeaseStatusIDs[]=2` — do not infer from a prior export.
3. For each lease, reconcile: billed rent, concessions, fees, payments, credits, and reversals.
4. Compute current balance, days late, last payment date, and unexplained items.
5. Separate facts from recommendations:
   - **facts:** unit, resident, balance, days late, last payment
   - **flags:** unapplied payment, duplicate charge, stale balance, missing source
   - **gated:** ledger adjustment, waiver, reversal — mark `APPROVAL REQUIRED`
6. Cross-reference with five-day notice charge output if available (GL 57).
7. Produce the delinquency feed as data only — do not contact residents.

---

## Rentvine API Notes

- Lease statuses: 1=Pending, 2=Active, 3=Closed — always filter, never pull all.
- Bill detail: use `rentvine:get_bill` MCP tool with `includes: charges` — the REST endpoint `/accounting/bills/{id}` does NOT return charge lines.
- Work order statuses: 1=Pending, 2=Open, 3=Closed, 4=OnHold.

---

## Output Contract

Return a markdown summary with:
- Source export timestamp and active lease count
- Totals by property
- Delinquency feed rows: resident, unit, balance, days late, last payment
- Unmatched or unsupported items
- Five-day notice charge status if applicable
- Any proposed ledger adjustments marked `APPROVAL REQUIRED — route to Randi`

---

## Validation

- Totals tie to the Rentvine source export.
- Every flagged balance has a resident/unit reference.
- Every proposed ledger change has a source line and approval status.
- No resident-facing message was sent.
- No ledger write was performed without approval.
