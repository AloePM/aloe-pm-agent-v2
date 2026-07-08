---
name: five-day-notice-charges
description: "Audit the automated Cloud Scheduler five-day notice charge job (runs 9 AM Phoenix on the 5th of each month, GL 57). Verify delinquent residents were charged, no duplicates, no charges on zero-balance residents. Run on the 6th each month or on demand. No ledger changes without Randi's approval."
---

# Five Day Notice Charges

Bo uses this skill to audit the automated five-day notice charge postings the day after the automation runs. Bo catches failures, duplicates, or missed residents — it doesn't re-run the automation.

---

## Background

Aloe runs a Cloud Scheduler job at 9 AM Phoenix time on the 5th of each month that automatically posts five-day notice charges (GL 57) to residents with unpaid balances. Bo audits the output the next day.

---

## Hard Gate

Posting, reversing, or adjusting a notice charge requires Randi's approval.

---

## GL Reference

- **GL 57** — Five Day Notice Fees (auto-posted by Cloud Scheduler)
- Do not confuse with GL 14 (Late Fees) — these are separate charges

---

## Inputs

- Rentvine resident ledger balances as of the 5th
- GL 57 postings for the current period
- Delinquency feed from `ar-rent-posting` if available

---

## Workflow

### 1. Identify who was delinquent on the 5th
Pull resident balances as of the 5th. Any resident with balance > $0 should have received a GL 57 charge.

### 2. Pull GL 57 postings for the period
Query Rentvine for GL 57 charges posted on or around the 5th.

### 3. Cross-check
- **Missing charge:** resident was delinquent but no GL 57 posted → flag
- **Duplicate charge:** more than one GL 57 on same resident in same period → flag
- **Charge on zero-balance resident:** GL 57 posted but ledger shows $0 or credit → flag

### 4. Check automation status
Surface any Cloud Scheduler job errors from the most recent run if accessible.

### 5. Compute totals
Total GL 57 charges posted vs. expected. Surface variance.

---

## Output Contract

Return:
- Automation run date and status if available
- Delinquent resident count as of the 5th
- GL 57 charges posted: count and total amount
- Missing charges: resident, property, balance
- Duplicate charges: list
- Zero-balance erroneous charges: list
- All corrections marked `APPROVAL REQUIRED — route to Randi`

---

## Validation

- Delinquency data is sourced from Rentvine, not inferred.
- Every missing or duplicate charge has a resident/property reference.
- No ledger adjustment was made without Randi's approval.
- Job status is noted, not assumed to have succeeded.
