---
name: hoa-registration-audit
description: ALWAYS use this when auditing or reconciling HOA tenant registrations at Aloe Property Management — building/updating the HOA registration tracker, pulling HOA registration-fee bills from Rentvine, finding tenants who were never registered, or checking which HOA-property tenants are registered vs. missing. Use it the moment you're building the audit, classifying a tenant with no fee bill, or producing the gap list. Covers the Rentvine bill pull, the ~$25 line-item rule, the move-in-date cohorts (the false-positive trap), the gap list, and per-property status. To register one tenant, use **hoa-registration**.
---

# HOA Registration Audit — Aloe Property Management

Reconcile **who is actually registered with their HOA** against what Rentvine
shows, and surface the **tenants who were never registered** — the core risk.
This skill is the *reconciliation*; **hoa-registration** is the *process* of
registering a single tenant.

**Tracker:** `HOA_Registration_Audit_v2.xlsx` (built from Claude.ai via the
Rentvine MCP). Keep it current; every registered row should be traceable to a
Rentvine Bill ID and/or a saved HOA confirmation.

## Data source

Rentvine, queried via the connected **Rentvine MCP**. *(Direct API reference, if
ever needed: base URL `https://aloepm.rentvine.com/api/manager`; auth = Basic
`base64(apiKey:apiSecret)` + header `X-Rentvine-Account: aloepm`. Credentials
live in a gitignored `.env` — never commit or paste them.)*

## The Rentvine pull

Pull **bills from Jan 1 2024 → today**, then keep the **union** of:

1. **Reimbursement set** — reference contains **`hoa`** (any capitalization)
   **AND** payee = **"Aloe Property Management - REIMBURSEMENTS"**.
2. **HOA-dues set** — any bill with a **line item charged to the "HOA dues"
   account** (this catches direct-to-HOA-vendor bills, since there's no vendor
   master list).

**Dedupe by Bill ID.** For each matching bill, fetch full detail **including line
items**, and extract the **registration-looking** line items — **~$25 (treat as
$20–$30)**. Capture per line item: `Bill Date, Bill ID, Payee, Reference,
Property Address, Tenant Name, Amount`.

## Classifying a tenant with NO registration-fee bill

A missing fee bill does **not** automatically mean "never registered." Classify
by the tenant's **move-in date** and how the property came to us — only the first
is a true gap:

| Situation | Classification | Resolve by |
|---|---|---|
| **Move-in Feb 2024 or later**, HOA property, no fee bill **and** no HOA confirmation | **TRUE GAP** — act on it | Register now (hoa-registration) |
| **Move-in before Feb 2024**, no fee bill | **Check previous system** — not a confirmed gap | Look up registration in the **previous system** |
| **Property onboarded with an existing tenant** | **Verify prior registration** — may already be registered | Confirm with **prior PM/owner**, or **ask the tenant** |
| Fee paid but **no HOA confirmation** on file | **Incomplete** — fee ≠ proof | Get/save the HOA confirmation |

> Fallback: if there's no record in Rentvine, the previous system, or onboarding
> docs, **ask the tenant** whether they were already registered before flagging a
> true gap.

## Outputs

- **Tracker / audit** (`HOA_Registration_Audit_v2.xlsx`) — the registration-fee
  rows (columns above), each traceable to a Bill ID.
- **Gap list** — **true gaps** (Feb-2024+, no fee, no confirmation) to act on,
  kept separate from **to-verify** items (check-previous-system /
  verify-prior-registration).
- **Per-property status** — for each HOA property: registered? fee booked?
  renewal due date?

## This skill NEVER

- **Never calls a tenant a gap without classifying the cohort first** — pre-Feb-
  2024 and onboarded-with-tenant cases get checked (previous system / prior
  PM-owner / ask tenant), not flagged outright.
- **Never marks a tenant "registered" on a paid fee alone** — registration is
  proven by the **HOA's confirmation**, not the bill.
- **Never silently includes or drops an ambiguous line item** — flag it.
- **Never exposes tenant personal/financial data** beyond what the audit needs.
- **Never commits or pastes Rentvine credentials** — gitignored `.env` only.
