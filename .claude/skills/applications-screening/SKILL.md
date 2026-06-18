---
name: applications-screening
description: ALWAYS use this when an application lands or moves on the Aptly Applications board at Aloe Property Management, or when processing, verifying, screening, approving, or denying an applicant. Use it the moment you're about to check a new application, confirm a showing, verify co-applicants, calculate income, request rental history, review credit/eviction/criminal screening, issue an adverse-action letter, or mark an app approved/rejected. Covers the full processing order, the screening criteria (income 2.5x net, credit 550, evictions, criminal, voucher rule), who does what, exception routing, and the hard never-rules. Do NOT process, approve, or deny an application without it. Residential only; ends at approval/denial — lease prep is a separate skill.
---

# Applications & Screening — Aloe Property Management (Residential)

Process every application **the same way, in order**, against the criteria in the
playbook. Screening criteria (income, credit, evictions, criminal, occupancy,
voucher rule, automatic declines, exception options) live in **one place** —
**`leasing-coordinator.md` → "Screening criteria"** — read it before deciding
anything. This skill is the **process**; the playbook is the **standard**.

Scope: from a submitted application **through approval or denial**. Lease
creation, Rentvine setup, and fees are a **separate skill** — stop at "approved,
terms ready" or "adverse-action issued."

## Roles

- **Leasing Lead / Leasing Assistant** — process applications (the default
  operator for this skill).
- **Property Manager** — **pulls the screening manually**; clarifies any
  questionable criminal/credit finding; owns final approval.
- **Vacant Unit Manager** — creates and sends **adverse-action letters**, labels
  the app rejected, attaches the letter to the Aptly summary page.
- **Office (Randi)** — recreates a **$12 Stripe invoice** for an invalid-SSN
  re-run.

## Application basics

- **Every adult 18+ applies separately** and pays the **$65** fee (per adult).
  The fee is **never refundable.**
- Applicants **upload everything in the application**. If something won't pass or
  upload, they can email **info@aloepm.com** and add it there.
- Apps land on the **Aptly Applications board** — this is the trigger for this
  skill.

## Processing order (do not skip or reorder)

1. **Confirm an in-person showing happened.** At least one applicant must have
   toured in person — check the application answer and confirm against the
   property's showing history. If unconfirmed, **do not process**; ask the
   applicant, then verify.
2. **Are we first in line?** If a good application is already in processing for
   that property → send **"Property Unavailable – Just Applied."** If the prior
   one is questionable, start the next by sending **Rental Verification** and
   checking criteria.
3. **Co-applicants all applied?** If anyone is missing, **do not proceed** — tell
   the applicants we have theirs but need **all** applications to continue.
4. **Send out rental history** verification (housing-history section /
   "1st Rental History Verification Request").
5. **Calculate income** against the playbook standard (**2.5x NET**; voucher =
   **2.5x net of the tenant's portion, min $1,500**; co-applicants may average;
   co-signers may **not** be used for income). Docs must be current (stubs/bank
   within 30 days; tax prior year; offer letter OK for a new job). If income is
   **missing**, fill in **"What is Missing"** (Additional Fields) and **send to
   resident** in Aptly. If income **fails** and no co-signer → alert the **Vacant
   Unit Manager** for an **adverse-action letter**.
6. **Run tenant screening** — the **Property Manager pulls it manually.**
7. **Review screening** (in this order):
   - **Credit** — **550+** TransUnion (personal or averaged). Below → adverse
     action (reason: credit). **No credit found** (solo applicant) → request a
     **co-signer within 24 hours** (same link); with co-applicants, the others
     must meet the score. **Invalid SSN** → **$12 re-run** (Randi recreates the
     Stripe invoice), then update SSN and rerun. **Active bankruptcy** → cannot
     approve → adverse action.
   - **Eviction** — **no eviction or filing in the last 5 years; no exceptions.**
     Any → adverse-action letter.
   - **Criminal** — for credit-qualified applicants: deny on a **felony in the
     last 7 years** (property / financial / violent) or **registered sex
     offender** (no time limit). Run the **extra checks** (Intelius by
     name+DOB; icrimewatch sex-offender by name). Match possibles against the
     **photo ID**. Post any disqualifying findings to **Slack #applications**.
     **Unsure → ask the Property Manager.**
8. **Alert the leasing manager** once all steps are complete — email:
   - Subject: **property address**
   - Body: applicant name(s), property address, **net (qualifying) income**
     (the figure checked against 2.5x NET), **average credit score**.
9. **Check the queue** for the next applicant on that property.

## Exceptions (never promised — PM/Owner decides)

- **Lower income** with funds in bank → **higher security deposit** may be
  considered.
- **Lower credit** (AZ) → **co-signer** or **higher deposit** may be considered.
- A special circumstance should be emailed to **info@aloepm.com before applying.**
- Anything outside criteria is an **exception → escalate to PM/Owner**; reach out
  to the **owner** for the exception. **Make no promises.**

## What good output looks like

- All co-applicants applied, **in-person showing confirmed**, docs complete,
  income calculated, screening reviewed — and the result is either:
  - **Approved, terms ready**, with the completion email sent (address, net
    (qualifying) income, average credit score), **or**
  - **Adverse-action letter issued**, app **labeled rejected**, letter attached
    to the Aptly summary page.
- Every step and decision **logged in Aptly**; nothing decided on a guess.

## This skill NEVER

- **Never process an application with no in-person showing** by any applicant.
- **Never proceed until all co-applicants have applied.**
- **Never issue a denial as anything other than a proper adverse-action letter**
  (created by the Vacant Unit Manager, with reason, attached + labeled rejected).
- **Never refund an application fee** — under any circumstance.
- **Never expose one applicant's screening or financial data to another
  applicant** or to anyone who doesn't need it.
- **Never approve outside criteria, set/quote a deposit or term, or promise an
  exception** without **PM/Owner sign-off** — and **never make verbal promises**
  about repairs, holds, or terms.
- **Never vary criteria, process, or terms by protected class** — fair housing is
  non-negotiable.
