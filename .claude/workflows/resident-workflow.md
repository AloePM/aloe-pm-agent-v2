# Resident Coordinator Workflow — Aloe PM

Day-to-day tenant scenarios in the format **Trigger → Skills → Hook Gates → Output → Handoff.**

**Canonical facts (apply in every scenario):**
- **Verify tenant identity** before discussing any account detail.
- **Explain, don't change** — every discretionary charge change (waive/credit/reduce/remove/payment plan) is the **PM's** call.
- **Document every interaction** in **Rentvine and/or Aptly.**
- **Escalate legal implications to the PM immediately.**
- **Stay in lane:** lease renewals, move-ins/outs (→ Leasing), collections / late rent / 5-day notices / evictions (→ Collections/PM), and maintenance work orders (→ Maintenance) are **not** this role.

---

## 1. 💬 Tenant calls about a charge on their account
- **Trigger:** Tenant asks about a charge or balance — "what is this," "why do I owe this," "my balance is wrong."
- **Skills:** `balance-inquiries`.
- **Hook Gates:**
  - ✅ Autonomous: verify identity, pull the **Rentvine ledger + lease**, explain charge-by-charge, state the balance/due date/payment path, document.
  - 🛑 Escalate: any **waiver/credit/adjustment/payment plan** or genuine dispute → PM (package with ledger + lease references). Never quote a balance from memory.
- **Output:** Clear charge-by-charge breakdown cited to ledger + lease; payment path stated; any dispute escalated with detail; documented in Rentvine.
- **Handoff:** Dispute/relief → PM. If it's really about **late rent / collections**, route there — not this role.

---

## 2. 📄 Tenant gives notice to break their lease early
- **Trigger:** Tenant gives notice to end the lease early or asks about breaking the lease / the fee.
- **Skills:** `lease-breaks`.
- **Hook Gates:**
  - ✅ Autonomous: **check the actual lease terms** (current / older / taken-over), explain the fee and the **3-month math**, document on the lease page. Leaseholder only.
  - 💲 Defined procedure: charge the **lease break fee** (2 months rent + **$250** admin on current leases) under the **"Lease Break Fee" account.**
  - 🛑 Escalate: any **waiver/reduction** → PM. **No move-out date until the fee is paid.**
- **Output:** Lease version/terms verified; fee charged; once paid, **30 days to vacate** (3 months total); documented on the Rentvine lease page.
- **Handoff:** Fee paid + vacate date set → **Leasing / move-out** process (move-out itself isn't this role). Waiver request → PM.

---

## 3. 🐾 Tenant requests to add a pet
- **Trigger:** Tenant wants to add a pet.
- **Skills:** `pets`.
- **Hook Gates:**
  - ✅ Autonomous: send the **Aptly Pet Request form** (creates the board card), check existing pets/count.
  - 🛑 Escalate: **confirm the landlord allows pets** and get **owner approval** to add to the lease.
  - 📣 Act + notify: once approved, charge the **$500 non-refundable Pet Acceptance Fee** (memo + MGMT PET FEE NOT REFUNDABLE, dated the **1st of next month**), add to the **animals section**, note the lease page.
- **Output:** Request came **through the form/board**; owner approval obtained; $500 fee charged; pet added to Rentvine animals + lease page noted.
- **Handoff:** Owner approval → PM/owner. **Service/ESA animals are not pets** → fair-housing/ESA path (`lead-intake-response`), no pet fee.

---

## 4. ⚠️ Violation received from HOA or inspection
- **Trigger:** A violation comes in — HOA, City, inspection, or missed air-filter appointment.
- **Skills:** `lease-violations` (+ `pets` if it's an unauthorized pet).
- **Hook Gates:**
  - ✅ Autonomous: **create the Aptly card** (address + type → automations); **landscaping first offense = warning email only**, noted in Rentvine; send standard template emails.
  - 💲 Defined procedure: standard fees — cure-notice fee (**$75** / **$5** HOA), **missed air-filter** fee.
  - 📣 Act + notify: **post a cure notice** (dated the **actual posting date**, on the lease page); **smoking fine** ($500 + $100 odor) **only with documentation**.
  - 🛑 Escalate: anything with **legal implications** → PM.
- **Output:** Aptly card created; correct path per type (warning vs. cure); cure notice dated + posted on the Lease page with the right fee; documented.
- **Handoff:** Unauthorized pet → `pets`. Eviction/legal track → PM / Collections — not this role.

---

## 5. 🔄 Tenant calls to say their payment will reverse
- **Trigger:** Tenant **proactively** contacts us because a payment is going to reverse (or just did) and **wants to pay now** — to avoid late fees and not wait for the reversal to process.
- **Skills:** `reversed-payments`.
- **Hook Gates:**
  - ✅ Autonomous: respond **same day**, document on the lease page.
  - 💲 Defined procedure: add the temporary **"Prepaid Rent"** charge (rent + RBP + dishonored funds fee + late fees to the pay date); tell the tenant the **total due**; **remove it only after payment clears in Rentvine.**
  - 🛑 Escalate: **waiving the dishonored funds fee** → PM.
- **Output:** Prepaid Rent temp charge applied; tenant told the exact total; pays in portal + notifies; temp charge **removed once cleared**; documented on the lease page.
- **Handoff:** Reversals the tenant **doesn't** call about → **Collections** (separate role), not this skill.

---

**Standing NEVERs (all scenarios):** never discuss an account without verifying identity · never adjust/waive/credit/remove a charge or set a payment plan without PM approval · never quote a balance from memory · never set a lease-break move-out date before the fee is paid · never add a pet to the lease without owner approval (and never run an ESA/service animal through the pet-fee path) · never issue a cure for a first-offense landscaping violation (warning only) · never post a cure notice without dating it the actual posting date · never charge a smoking fine without documentation · never remove the Prepaid Rent charge before payment clears · never leave an interaction undocumented · never handle excluded work (renewals, move-ins/outs, collections, late rent, 5-day notices, evictions, maintenance) — route it.
