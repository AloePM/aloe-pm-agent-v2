---
name: hoa-registration
description: ALWAYS use this when anything touches HOA tenant registration at Aloe Property Management — registering a new/renewing tenant with an HOA, handling an HOA registration notice/form/invoice, booking or reconciling an HOA registration fee, or auditing which HOA-property tenants are registered. Use it the moment an HOA property gets a new lease/move-in, an HOA sends a request, or you're building/checking the HOA registration audit. Covers triggers, how to identify HOA properties, the registration steps, fee booking (reimbursement / HOA-dues / owner), the Rentvine audit pull, and the hard never-rules. Do NOT register a tenant, book an HOA fee, or call a tenant "registered" without it.
---

# HOA Registration — Aloe Property Management

Make sure every tenant at an HOA property is **actually registered with the HOA**,
the fee is **booked correctly**, and nothing **lapses** — and be able to **prove
it** from Rentvine. The core risk this guards against: a tenant who was never
registered with their HOA.

## When it triggers

- **New lease / move-in** at an HOA property.
- **HOA notice/request** — the HOA sends a registration form, request, or invoice.
- **Lease renewal** — re-registration required at renewal/annually.
- **New HOA property onboarded** — Aloe takes on a property in an HOA.

## Identifying an HOA property

- **Rentvine property record** — HOA flag/field or notes on the property.
- **Owner / onboarding docs** — owner-provided info or onboarding paperwork names
  the HOA.

> There is **no reliable master list of HOA vendor names.** When the property
> record/docs are silent, infer HOA involvement from **bills booked to the
> "HOA dues" account** — and treat building that picture as part of this tracker.

## Registration steps

1. **Submit the registration form + lease** — complete the HOA's tenant-
   registration form and attach the lease/tenant info the HOA requires.
2. **Pay the registration fee** (~$25) via a bill in Rentvine — booked per the
   rules below.

## Fee booking (how the ~$25 fee is paid in Rentvine)

A registration fee shows up in one of three ways — book it the right one:
- **Reimbursement bill** — Aloe pays, then bills payee **"Aloe Property
  Management - REIMBURSEMENTS"** with **"HOA"** in the reference.
- **Direct to HOA vendor** — bill paid directly to the HOA/vendor, charged to the
  **"HOA dues"** account.
- **Owner expense** — booked as an owner expense on the property.

(Registration fees are **not** passed to the tenant ledger.)

## Building the audit — Rentvine pull

Data comes from **Rentvine** (queried via the connected Rentvine MCP). Pull
**bills from Jan 1 2024 → today**, then keep the **union** of:

1. **Reimbursement set** — reference contains **`hoa`** (any capitalization)
   **AND** payee = **"Aloe Property Management - REIMBURSEMENTS"**.
2. **HOA-dues set** — any bill with a **line item charged to the "HOA dues"
   account** (this is how direct-to-HOA-vendor bills are caught, since there's no
   vendor master list).

**Dedupe by Bill ID.** For each matching bill, fetch full detail **including line
items**, and extract the **registration-looking** line items — **~$25 (treat as
$20–$30)**. Build `hoa-registration/HOA_Registration_Audit.csv` with columns:

`Bill Date, Bill ID, Payee, Reference, Property Address, Tenant Name, Amount`

> Rentvine API reference (if queried directly instead of via MCP): base URL
> `https://aloepm.rentvine.com/api/manager`; auth = Basic `base64(apiKey:apiSecret)`
> plus header `X-Rentvine-Account: aloepm`. Credentials are **never** committed —
> keep them in a gitignored `.env`, not in the repo or chat.

## What good output looks like

- **Audit CSV** of registration fees paid (the columns above) — every row traces
  to its **Bill ID** so it's verifiable in Rentvine.
- **Gap list** — HOA properties/tenants with **no matching registration
  fee/record** = the misses to act on.
- **Per-property status** — for each HOA property: registered? fee booked?
  renewal due date?
- Nothing asserted on a guess; HOA-property inference and any ambiguous line item
  is flagged, not silently included or dropped.

## This skill NEVER

- **Never marks a tenant "registered" without confirmation/record** — a paid fee
  alone is **not** proof of registration.
- **Never skips a known HOA property** — surface registration gaps, don't drop
  them.
- **Never misbooks the fee** — follow the reimbursement / HOA-dues / owner rules;
  don't charge it to the wrong account, owner, or tenant.
- **Never exposes tenant personal information to the HOA** beyond what the
  registration actually requires.
- **Never commits or pastes Rentvine credentials** — gitignored `.env` only.
