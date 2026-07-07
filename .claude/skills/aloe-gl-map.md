# Aloe PM — GL Account Map & Accounting Reference

Ingest this file to the KB at setup:
```bash
cortextos bus kb-ingest ./aloe-gl-map.md --org "$CTX_ORG" --scope private
```

---

## Full GL Account Map (from `jay.js` / `mae.js`)

| GL ID | Category Label | Notes |
|-------|---------------|-------|
| 12 | (Aloe internal) | Excluded from owner deductions |
| 14 | Late Fees | Auto-charged on delinquent accounts |
| 19 | (Aloe internal) | Excluded from owner deductions |
| 40 | Resident Benefit Package (RBP) | $15/mo per active lease |
| 43 | Renewal Fees | $99/yr per lease renewal |
| 51 | Pet Fees | |
| 56 | Transaction Fees | |
| 57 | Five Day Notice Fees | Auto-posted by Cloud Scheduler on the 5th |
| 58 | Administrative / Inspection Fees | Admin fees and inspection fees share this GL |
| 62 | Lease Break Fees | |
| 82 | Cleaning | |
| 90 | (Aloe internal) | Excluded from owner deductions |
| 93 | Management Fees | $89/mo per active property (standard) |
| 94 | Lease / Placement / Onboarding Fees | $750 per new tenancy placed |
| 136 | (Aloe internal) | Excluded from owner deductions |
| 145 | (Aloe internal) | Excluded from owner deductions |
| 148 | SN-Resident Benefit Package | Variant of GL 40 for certain lease types |

## Owner Deduction Exclusion List

These are Aloe's own fee accounts. **Never deduct a bill on these from owner net:**

```
93, 94, 40, 148, 58, 14, 51, 90, 136, 57, 12, 62, 56, 145, 19
```

---

## Aloe PM Contact / Payee IDs in Rentvine

| Contact ID | Name / Purpose |
|-----------|---------------|
| 1 | Aloe PM — primary management company contact (management income bills) |
| 3229 | Aloe Reimbursement Vendor — expense log bills created via `/expense-log` form |
| 3380 | Aloe PM-Vendor — secondary management contact for bill categorization |

When querying management income bills, filter to contactIDs `[1, 3380]`.
When querying reimbursement bills (expense log), filter to `payeeContactID === '3229'`.

---

## Standard Fee Structure

| Fee | Rate | Cadence | GL |
|-----|------|---------|-----|
| Management Fee | $89/mo | Monthly per active property | 93 |
| Leasing / Placement Fee | $750 | Per new tenancy placed | 94 |
| Renewal Fee | $99/yr | Per lease renewal | 43 |
| RBP | $15/mo | Monthly per active lease | 40 / 148 |

---

## Net Payout Formula (Settlement Alert)

```
Net payout = settled rent applied to owner
           − management fee ($89 full month | $44.50 partial month)
           − unpaid owner expense bills
               (EXCLUDING any bill on an Aloe fee account — see exclusion list)
```

The `accounting-settlement-alert` skill in the repo handles this calculation.

---

## Expense Log Reference

| Item | Value |
|------|-------|
| Google Sheet ID | `1T4XX6PBvqAzM9jQ_mXhJi0_eWhd6EnQnCr9HXppbhGE` |
| Tab name | Expense Log |
| Payables report endpoint | `POST /reports/payables?exportTypeID=1` |
| Filter | `payeeContactID === '3229'` |
| Dedup key | `billID + address` composite — never billID alone |

---

## Agent Responsibilities (Accounting Domain)

| Agent | Scope | Channel |
|-------|-------|---------|
| Bo | All day-to-day accounting operations: AR review, expense log, fee reconciliation, trust rec, delinquency feed, notice charge audit, owner statement drafts, AP batch drafts | `#bo-accounting` (`C0BCCV790VC`) |
| Mae | Company-level financials only: revenue snapshots, management fee income tracking, cash flow summaries, QBO reconciliation context. Randi-only. | `#financials` (`C0BDEUCP6MA`) |
| Jay | Transaction-level GL categorization lookup | Any channel |
| Randi | Final approver for all money movement, ledger adjustments, external sends | Owner |

**Privacy boundary:** Bo answers property-specific fee and ledger questions but never reveals total company income, Aloe's monthly management fee totals, or deposit breakdowns. Those go to Mae in `#financials` only.

---

## Rentvine API Reference

| Entity | Status ID | Meaning |
|--------|-----------|---------|
| Work Orders | 1 | Pending |
| Work Orders | 2 | Open |
| Work Orders | 3 | Closed |
| Work Orders | 4 | OnHold |
| Leases | 1 | Pending |
| Leases | 2 | Active |
| Leases | 3 | Closed |

**Always filter leases by `primaryLeaseStatusIDs[]=2` (active) or `=3` (closed) — never unfiltered.**

**Bill detail:** use `rentvine:get_bill` with `includes: charges`. The REST endpoint `/accounting/bills/{id}` does NOT return charge lines.
