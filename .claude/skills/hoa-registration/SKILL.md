---
name: hoa-registration
description: ALWAYS use this when registering a tenant with an HOA at Aloe Property Management — a new lease/move-in at an HOA property, an HOA registration notice/form/invoice, a renewal re-registration, or a newly onboarded HOA property. Use it to find the HOA's requirements, submit the registration, book the ~$25 fee correctly, and record proof. Covers triggers, identifying HOA properties, deadlines/fines, fee booking (reimbursement / HOA-dues / owner), and confirmation. For auditing who is/ isn't registered, use **hoa-registration-audit**. Do NOT register a tenant, book an HOA fee, or call a tenant "registered" without it.
---

# HOA Registration — Aloe Property Management

Get every tenant at an HOA property **actually registered with the HOA**, on
time, with the fee **booked correctly** and **proof on file.** The core risk:
a tenant who was never registered — which can mean **fines** and **lost amenity
access.** Owned by the **dedicated registration admin / office** (central, not
per-PM).

> To find/reconcile *which* tenants are registered (the audit, gap list, and
> tracker), use the **hoa-registration-audit** skill. This skill is the
> *process* of registering one tenant.

## When it triggers

- **New lease / move-in** at an HOA property.
- **HOA notice/request** — the HOA sends a registration form, request, or invoice.
- **Lease renewal** — re-registration required at renewal.
- **New HOA property onboarded** — Aloe takes on a property in an HOA. *(The
  existing tenant may already be registered — verify before re-registering; see
  hoa-registration-audit.)*

## Identifying an HOA property

- **Rentvine property record** — HOA flag/field or notes on the property.
- **Owner / onboarding docs** — owner-provided info or onboarding paperwork names
  the HOA.

> There is **no reliable master list of HOA vendor names.** When the record/docs
> are silent, infer HOA involvement from **bills booked to the "HOA dues"
> account**.

## Find the HOA's requirements

Every HOA differs — get the current form, portal, fee, and **deadline** from:
- **The property record** — HOA name/contact/portal/requirements saved at
  onboarding.
- **The HOA management company** — look up / call / email for their process.
- **The HOA's own notice** — the letter/invoice/welcome packet that states the
  form, fee, and deadline.

## Register the tenant

1. **Submit the registration form + lease** — complete the HOA's tenant-
   registration form and attach the lease/tenant info they require.
2. **Pay the registration fee** (~$25) via a bill in Rentvine — booked per the
   rules below.

## Deadlines & consequences (don't let it lapse)

- **Deadline after move-in** — HOAs typically require registration within a set
  window of the tenant moving in. Track it from the move-in date.
- **Fines for late/missing registration** — fall on the owner/property; avoid
  them by registering on time.
- **Amenity/access blocked** — unregistered tenants can lose gate/pool/amenity
  access until registered.

## Fee booking (how the ~$25 fee is paid in Rentvine)

A registration fee is booked one of three ways — use the right one:
- **Reimbursement bill** — Aloe pays, then bills payee **"Aloe Property
  Management - REIMBURSEMENTS"** with **"HOA"** in the reference.
- **Direct to HOA vendor** — bill paid directly to the HOA/vendor, charged to the
  **"HOA dues"** account.
- **Owner expense** — booked as an owner expense on the property.

(Registration fees are **not** passed to the tenant ledger.)

## Confirm & record (what counts as proof)

- **Save the HOA's confirmation** — approval email or registered-tenant doc — to
  the property record. **This is the proof of registration.**
- **Mark it registered + date** in the HOA registration tracker (see
  hoa-registration-audit).
- The **paid fee bill in Rentvine is the record of payment** — it is **not** by
  itself proof the HOA registered the tenant.

## This skill NEVER

- **Never marks a tenant "registered" without the HOA's confirmation** — a paid
  fee alone is **not** proof.
- **Never misses a known HOA property's deadline** — register on time; don't let
  fines or access loss happen.
- **Never misbooks the fee** — follow the reimbursement / HOA-dues / owner rules;
  don't charge it to the wrong account, owner, or tenant.
- **Never exposes tenant personal information to the HOA** beyond what the
  registration actually requires.
