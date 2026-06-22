---
name: accounting-settlement-alert
description: ALWAYS use this whenever anyone asks about settled payments, owner payouts, late/past-due payments clearing, or which owners are ready to be paid out at Aloe Property Management. Use it the moment someone wants to know whether a past-due payment has settled, what an owner's net payout is, or who is ready for disbursement. It pulls today's Rentvine settlement-detail report (via the Rentvine MCP), classifies settled payments as past-due vs. prepaid, and computes net payout = settled rent − management fee ($89, or $44.50 partial month) − unpaid owner expense bills (excluding Aloe fee accounts). Do NOT estimate a payout, call an owner "ready," or quote a net figure without it.
---

# Accounting Settlement Alert — Aloe Property Management

Find the **settled payments that cover past-due charges** and compute each
owner's **net payout** — so you can say exactly **which owners are ready to be
paid out** today, with a traceable breakdown.

## Data source

**Rentvine, queried via the connected Rentvine MCP.** Pull the
**settlement-detail report for today.** *(If ever queried directly: base URL
`https://aloepm.rentvine.com/api/manager`, Basic `base64(apiKey:apiSecret)` +
header `X-Rentvine-Account: aloepm`. Credentials live in a gitignored `.env` —
never commit or paste them.)*

## Steps

1. **Pull today's settlement-detail report** from Rentvine (MCP).
2. **Classify each settled payment** by cross-referencing the lease charges:
   - **Past-due** — the payment settles a charge that was **already due** (a late
     payment clearing). **These are what make an owner ready for payout.**
   - **Prepaid** — the payment is **ahead of the due date** (a future period).
     Not a past-due clearing; do **not** count it as ready-to-pay-out.
3. **For each owner with a settled past-due payment, compute net payout** (below).
4. **Report which owners are ready**, each with the net figure and the breakdown.

## Net payout calculation

```
Net payout = settled rent applied to the owner
             − management fee        ($89 full month  |  $44.50 partial month)
             − unpaid owner expense bills
                 (EXCLUDING any bill on an Aloe fee account — see list)
```

- **Management fee:** **$89** for a full month, **$44.50** for a **partial
  month.** Confirm which applies — don't guess.
- **Unpaid owner expense bills:** deduct the owner's outstanding expense bills —
  **but exclude any bill posted to an Aloe fee account**, since those are Aloe's
  own fees (already accounted for / not owner expenses).

## Aloe fee accounts — EXCLUDE from owner deductions

These account IDs are **Aloe fee accounts.** Never deduct a bill/charge on these
as an owner expense:

```
93, 94, 40, 148, 58, 14, 51, 90, 136, 57, 12, 62, 56, 145, 19
```

## What good output looks like

- The list of **owners ready to be paid out** — i.e., those whose settled
  payment **covers a past-due charge.**
- Per owner: **settled amount**, **past-due vs. prepaid** classification,
  **management fee** deducted ($89 / $44.50), **owner expense bills** deducted
  (with Aloe fee accounts excluded), and the **net payout.**
- Every figure **traceable** to today's settlement-detail report and the specific
  charges/bills.
- Prepaid-only settlements clearly marked **not ready** (no past-due clearing).

## This skill NEVER

- **Never deducts an Aloe fee account** (IDs above) as an owner expense.
- **Never counts a prepaid payment as past-due** or as ready-to-pay-out — only
  settled payments covering past-due charges count.
- **Never treats an unsettled payment as settled** — it must be **settled** on
  today's report, not merely received or pending.
- **Never guesses the management fee** — confirm full ($89) vs. partial ($44.50)
  month.
- **Never exposes owner or tenant financial data** beyond what the payout
  calculation requires.
