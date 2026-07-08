---
name: expense-log-sync
description: "Sync Rentvine reimbursement bills (payeeContactID 3229) to the Aloe Expense Log Google Sheet. Use when the sheet may be out of date, when new bills have been created against contact 3229, or as part of the monthly close checklist. Verify the sheet matches Rentvine, surface gaps, and flag dedup issues. No bill creation or ledger changes without Randi's approval."
---

# Expense Log Sync

Bo uses this skill to keep the Aloe Expense Log Google Sheet in sync with reimbursement bills in Rentvine.

The daily 8am Hub sync handles routine additions automatically — this skill is for verification, catch-up, and discrepancy surfacing. Rentvine is the system of record.

---

## Data Sources

| Source | Detail |
|--------|--------|
| Rentvine payables report | `POST /reports/payables?exportTypeID=1` — filter client-side by `payeeContactID === '3229'` |
| Google Sheet | Sheet ID `1T4XX6PBvqAzM9jQ_mXhJi0_eWhd6EnQnCr9HXppbhGE`, tab: `Expense Log` |
| Rentvine bill detail | `rentvine:get_bill` MCP tool with `includes: charges` |

**Note:** Contact 3229 is the reimbursement vendor only. Management income bills use contactIDs 1 and 3380 — those are Mae's domain, not part of the expense log.

---

## Dedup Key

**Composite key: `billID + address`** — not billID alone.

A single billID can appear multiple times if it spans multiple properties. Never deduplicate on billID alone.

---

## Hard Gate

Creating, editing, or voiding a Rentvine bill requires Randi's approval.

---

## Workflow

### 1. Pull Rentvine source
Run the payables report filtered to `payeeContactID === '3229'`.
Extract: billID, bill date, due date, description, address/property, amount.
Build a map keyed on `billID+address`.

### 2. Pull current sheet state
Read the Expense Log tab. Build the same `billID+address` map from existing rows.

### 3. Diff: Rentvine → Sheet
- **Missing from sheet:** bills in Rentvine not in the sheet — list for addition
- **In sheet but not in Rentvine:** orphan rows — possibly voided or deleted; flag
- **Amount mismatch:** same key but different amount — flag for review

### 4. Check for backdated bills
Check `modifiedDate` in addition to `startDate` to catch bills that were backdated.

### 5. Present results
Return the diff summary. Confirm authorization before writing to the sheet.

### 6. (With approval) Apply additions
Add missing rows using the composite key. Do not overwrite existing rows unless Randi approved the amount mismatch correction.

---

## Output Contract

Return:
- Total bills in Rentvine filtered to contact 3229
- Total rows in current sheet
- Missing from sheet: billID, address, amount, date
- Orphan rows in sheet
- Amount mismatches
- Backdated bill candidates
- Any write actions taken, or `APPROVAL REQUIRED — route to Randi` if not yet authorized

---

## Validation

- Source is the Rentvine payables report, not a cached or stale export.
- Dedup key is `billID+address` — never billID alone.
- No bill was created or modified in Rentvine without Randi's approval.
- Sheet writes are explicitly authorized before execution.
