# HOA Registration Workflow — Aloe PM

Format per scenario: **Trigger → Skills → Hook Gates → Output → Handoff.**
Owned by the **dedicated registration admin / office** (central, not per-PM).

**Canonical facts (apply in every scenario):**
- **Fee ~$25**, booked one of three ways: **reimbursement** (payee "Aloe Property Management - REIMBURSEMENTS", "HOA" in reference) · **direct to HOA vendor** ("HOA dues" account) · **owner expense**. Never to the tenant ledger.
- **Proof of registration = the HOA's confirmation**, saved to the property record. A paid fee bill is only the **payment** record.
- **Register before the HOA deadline** (set window after move-in) — late/missing risks **owner fines** and **lost amenity/gate access**.
- **Cohort cutoff = Feb 2024** for the audit (see scenario 3).

---

## 1. 🆕 New registration  *(move-in · HOA notice · renewal)*
- **Trigger:** New lease/move-in at an HOA property, an HOA registration notice/form/invoice, or a renewal re-registration.
- **Skills:** `hoa-registration`.
- **Hook Gates:**
  - ✅ Autonomous: identify the HOA + find its requirements (property record / management co. / notice), submit the form + lease, book the ~$25 fee per the rules, save the HOA confirmation, update the tracker.
  - 🛑 Escalate: booking it as an **owner expense**, any **fine exposure**, or anything outside the standard fee → Owner/PM.
- **Output:** Tenant registered **before the HOA deadline**; fee booked correctly; **HOA confirmation saved**; tracker marked registered + date.
- **Handoff:** → `hoa-registration-audit` — row traceable to Bill ID + saved confirmation.

---

## 2. 🔄 Onboarded property with an existing tenant
- **Trigger:** Aloe onboards a property in an HOA that **already has a tenant** (may already be registered).
- **Skills:** `hoa-registration-audit` (verify first) → `hoa-registration` (only if not already registered).
- **Hook Gates:**
  - ✅ Autonomous: verify prior registration — check **prior PM/owner**, or **ask the tenant**.
  - 🛑 Gate: **do not re-register or pay a second fee until verification fails** — avoid duplicate fees.
- **Output:** Registration status confirmed; if already registered, recorded with proof; if not, registered per scenario 1.
- **Handoff:** → tracker updated (registered, or true gap routed to scenario 1).

---

## 3. 🔎 Audit & gap reconciliation
- **Trigger:** Building/updating the audit, or checking which HOA-property tenants are registered.
- **Skills:** `hoa-registration-audit`.
- **Hook Gates:**
  - ✅ Autonomous: Rentvine MCP pull (Jan 2024→today; reimbursement set + HOA-dues set; dedupe by Bill ID; ~$25 line items), classify cohorts, build the gap list, update `HOA_Registration_Audit_v2.xlsx`.
  - 🛑 Route, don't guess: **true gaps** (Feb-2024+, no fee, no confirmation) → act via `hoa-registration`. **Pre-Feb-2024** → check previous system. **Onboarded-with-tenant** → verify (prior PM/owner / ask tenant). These are **to-verify, not gaps.**
- **Output:** Tracker (xlsx) · **gap list** (true gaps vs. to-verify, kept separate) · per-property status (registered? fee booked? renewal due?).
- **Handoff:** True gaps → scenario 1. To-verify → previous system / prior PM-owner / tenant.

---

**Standing NEVERs (all scenarios):** never call a tenant registered without the HOA's confirmation (fee ≠ proof) · never flag a pre-Feb-2024 or onboarded-with-tenant case as a gap before verifying · never pay a duplicate fee for an already-registered tenant · never misbook the fee (wrong account/owner/tenant) · never miss a known HOA deadline · never expose tenant personal data to the HOA beyond what registration requires · never commit or paste Rentvine credentials.
