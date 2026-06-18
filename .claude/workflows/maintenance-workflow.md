# Maintenance Coordinator Workflow — Aloe PM

Format per scenario: **Trigger → Skills → Hook Gates → Output → Handoff.**
Canonical SLAs: Emergency = respond ≤2h (24/7) · Urgent = accept ≤1 business day · Routine = accept ≤1 business day.
Cost limit = the WO maintenance amount ($350 default). Dispatch = assign in Aptly (auto-sends); never manual outreach for initial dispatch.

**Pre-dispatch checklist (runs BEFORE vendor selection in every scenario — check Aptly maintenance notes):**
**(1) Owner preferred vendor** → use it over our standard list · **(2) Home warranty** → file the claim through the warranty company before any Aloe vendor · **(3) Owner notification flag** → contact owner first and wait for reply before dispatch (**emergency exception:** dispatch + notify owner simultaneously).

---

## 🟢 Routine work order
*(minor/cosmetic — cabinet hinge, paint touch-up, non-urgent repair)*

- **Trigger:** Tenant reports a minor, non-urgent issue. Nothing broken-critical, leaking, or unsafe.
- **Skills:** `work-order-triage` → classify Routine → `vendor-dispatch` (pre-dispatch checklist → selection) → `work-order-followup`.
- **Hook Gates:**
  - ✅ Autonomous: classify, draft messages, update WO status notes.
  - 🛑 **Pre-dispatch checklist:** warranty → file first; preferred vendor → override list; **owner-notification flag → owner contact is an escalation, wait for reply before dispatch.**
  - 💲 Within threshold: dispatch in Aptly when cost ≤ WO maintenance amount ($350 default).
  - 🛑 Escalate: quote over limit; any owner-directed message.
- **Output:** Tier = Routine; checklist cleared (or warranty/owner-hold noted); vendor assigned in Aptly with reason; authorization limit stated; accept ≤1 business day, complete within ~1 week.
- **Handoff:** → `work-order-followup` (confirm → morning-of reminder → verify completion next business day, then Close).

---

## 🟠 Urgent work order
*(most WOs — appliance failure, partial service loss, non-extreme HVAC, pests; or any water leak)*

- **Trigger:** Issue affecting habitability/function but not an emergency. **Any active water → also trigger the water rule.**
- **Skills:** `work-order-triage` → classify Urgent (apply 💧 shutoff rule if water) → `vendor-dispatch` (pre-dispatch checklist → selection) → `work-order-followup`.
- **Hook Gates:**
  - ✅ Autonomous: classify, draft tenant/vendor messages, update status notes.
  - 📣 Act + notify after: send tenant **shutoff/safety tips** (water); under-threshold confirmations.
  - 🛑 **Pre-dispatch checklist:** warranty → file first; preferred vendor → override; **owner-notification flag → owner contact is an escalation, wait for reply before dispatch.**
  - 💲 Within threshold: dispatch in Aptly when cost ≤ WO maintenance amount.
  - 🛑 Escalate: quote over limit → owner approval before authorizing; any owner-directed comms.
- **Output:** Tier = Urgent; **for water: shutoff steps sent to tenant AND vendor dispatched, together**; checklist cleared; vendor + reason + authorization limit; accept ≤1 business day, resolve ≤48h.
- **Handoff:** → `work-order-followup`. If tenant says unresolved → reopen; if worsened → re-run `work-order-triage`.

---

## 🔴 Emergency work order
*(fire, flood/burst pipe, gas leak, no heat in winter, no AC in summer, sewage, unsafe/insecure unit)*

- **Trigger:** Safety/health threat, active spreading damage, security/habitability loss, or total loss of essential service. Vulnerable tenant or extreme weather **escalates** here.
- **Skills:** `work-order-triage` → classify Emergency (💧 shutoff if water) → `vendor-dispatch` (checklist runs, owner notified in parallel; Aptly **AND** confirming call) → `work-order-followup`.
- **Hook Gates:**
  - ✅ Autonomous: classify, draft messages, send tenant shutoff/safety tips immediately.
  - 🛑 **Pre-dispatch checklist — emergency exception:** still check warranty/preferred vendor, but **dispatch FIRST**; the owner-notification flag does **not** block — notify the owner **simultaneously**, never wait for a reply.
  - 🛑 **Always escalate to Owner/PM** — but **dispatch FIRST**; escalation runs in parallel, never before dispatch. Never wait on approval to dispatch an emergency.
- **Output:** Tier = Emergency; respond/dispatch ≤2h, 24/7; vendor assigned in Aptly + confirming call; tenant shutoff sent (if water); owner notified in parallel; resolve ASAP (≤24h target).
- **Handoff:** → `work-order-followup` (vendor confirmed/on-site ≤2h; verify completion **same day**). Owner/PM owns approvals and legal/habitability exposure.

---

**Standing NEVERs (all scenarios):** never dispatch without checking Aptly maintenance notes first · never ask a tenant to do a real repair (resets/shutoff only) · never skip shutoff for water (and never instead of dispatch) · never manually dispatch outside Aptly (emergency confirming call excepted) · never authorize over the limit without owner approval · never expose tenant private info to vendors · never close without confirmed completion · never let a WO go silent.
