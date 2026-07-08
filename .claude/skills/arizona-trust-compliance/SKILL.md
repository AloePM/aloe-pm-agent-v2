---
name: arizona-trust-compliance
description: "Arizona ADRE trust-accounting compliance checks. Overlays AZ-specific rules on the generic trust-compliance review: monthly three-way rec within 10 days, 14-business-day security deposit return deadline (A.R.S. § 33-1321), commingling prohibition, and deposit double-penalty risk. Bo runs this check monthly and surfaces any critical flags to Randi immediately. Verify-and-flag only — no corrections without Randi's approval."
---

# Arizona Trust Compliance (ADRE)

Bo uses this skill to overlay Arizona Department of Real Estate (ADRE) requirements on top of the standard trust-compliance review. Bo owns the monitoring and flagging. Randi approves any corrective action.

---

## Arizona ADRE Trust Accounting Rules

### Three-Way Reconciliation
- **Required cadence:** Monthly — within 10 days after month-end.
- **Formula:** Bank balance (adjusted for outstanding items) = book balance = sum of all beneficiary sub-ledger balances.
- **On break:** Flag immediately to Randi. Do not clear any variance without her approval and a documented explanation.

### Commingling Prohibition
- Trust funds (tenant deposits + owner rents) must stay in the designated trust account, separate from Aloe's operating funds.
- Any unexplained transfer from trust to operating = potential ADRE violation. Flag as `critical` to Randi immediately.

### Security Deposit Rules (A.R.S. § 33-1321)
- **Return deadline:** 14 business days after termination of tenancy and delivery of possession.
- **Itemization deadline:** If any portion is withheld, written itemized statement of deductions within 14 business days.
- **Penalty for late return/itemization:** Tenant may recover **twice** the security deposit wrongfully withheld, plus reasonable attorney fees.
- **Bo's action:** Track move-out date and possession delivery. Alert Randi when any deposit return is inside a 5-business-day window. Never release or withhold without her approval.

### Owner Disbursements
- Owner draws should not include funds still within ACH hold / payment clearance window.
- No commingling of security deposits with rent proceeds in the same line item on an owner statement.

### Record Retention
- Trust account records must be retained for at least 5 years.

---

## Workflow

1. Run the standard trust reconciliation (bank=book=liability).
2. Confirm the reconciliation was completed within 10 days of month-end.
3. Scan for commingling indicators:
   - Operating expenses charged to the trust account
   - Trust-to-operating transfer without documentation
   - Any negative sub-ledger balance
4. Pull open deposit return deadlines:
   - Flag any return where the 14-business-day window is 5 or fewer business days away
   - Flag any return already past the deadline as `critical` — alert Randi immediately
5. Confirm owner disbursements do not include uncleared funds.
6. Assign severity per the table below.

---

## Severity Reference

| Severity | Example |
|----------|---------|
| `critical` | Commingling detected; negative trust balance; deposit return deadline missed |
| `high` | Deposit deadline inside 5 business days; monthly rec > 10 days late |
| `medium` | Missing support for a trust disbursement; undocumented timing item |
| `low` | Watch item, no immediate risk |

---

## Output Contract

Return an AZ compliance risk report with:
- Three-way rec status and whether the 10-day rule was met
- Commingling scan result
- Open deposit deadlines with business days remaining
- Any past-due deposit returns marked critical
- Risk list with severity per item
- Every corrective action marked `APPROVAL REQUIRED — route to Randi`

---

## Validation

- Bank=book=liability is sourced from current reconciliation.
- Every deposit deadline ties to a move-out date and A.R.S. § 33-1321 calculation.
- No funds were moved.
- No ledger was corrected without Randi's approval.
