# Leasing Coordinator Workflow — Aloe PM

End-to-end funnel: **lead → tour → application → decision → signed lease.** Each stage uses the format **Trigger → Skills → Hook Gates → Output → Handoff.**
Residential only (commercial gets its own playbook).

**Canonical facts (apply in every stage):**
- **Response/showing window:** 8:00am–8:00pm Arizona time (automated touches fire anytime).
- **Criteria source of truth:** `playbooks/leasing-coordinator.md` → *Screening criteria* (published: aloepm.com/rental-criteria). **Income = 2.5x NET** · **credit ≥ 550** · **$65 non-refundable fee per adult**.
- **Authority:** coordinator qualifies/acts to criteria; **PM has final approval**; exceptions/pricing → Owner/PM.
- **Always:** fair housing absolute (same criteria/process for everyone) · make **no promises** (holds, repairs, terms, deposit, co-signer) · protect applicant data.

---

## 1. 🟦 Lead intake & response
- **Trigger:** New lead — Quo call/text, or a rental-website lead on the Aptly renter-leads board.
- **Skills:** `lead-intake-response`.
- **Hook Gates:**
  - ✅ Autonomous: respond within the 8–8 window, answer questions, send criteria link, qualify to criteria, log in Aptly, book the tour.
  - 🛑 Escalate: special circumstances / off-criteria → ask them to email; route exceptions to PM/Owner. Never promise; never quote/negotiate rent.
- **Output:** Lead logged (name, contact, property); questions answered; tour scheduled; special circumstances noted on the card.
- **Handoff:** → `showings` (card moves Engaged → Scheduled Tour).

---

## 2. 🟩 Showing / tour
- **Trigger:** Prospect wants to tour, or a Requested Showing Status = Pending on the board.
- **Skills:** `showings`.
- **Hook Gates:**
  - ✅ Autonomous: approve/deny self-serve tours to the ID-verification rules, issue/help with access, coordinate occupied-unit tours, drive post-tour feedback — all within 8–8 AZ.
  - 🛑 Gate: occupied/owner-occupied unit → **occupant must confirm** before approving. Pre-screen "yes" (credit <550 / felony 7yr / eviction 5yr) → ask them to explain, may allow; apply uniformly.
  - 🛑 Escalate: access failures (dead battery/lockout) → office/PM.
- **Output:** Showing approved/denied with reason logged; tour completed (door timestamp); feedback captured per vacancy.
- **Handoff:** → `applications-screening` (card moves Tour Completed → Applied; application link sent to Interested/Maybe).

---

## 3. 🟨 Application & screening
- **Trigger:** Application lands/moves on the Aptly Applications board.
- **Skills:** `applications-screening`.
- **Hook Gates:**
  - ✅ Autonomous: confirm in-person showing happened, check first-in-line, confirm all co-applicants applied + fees paid, send rental-history verification, calculate income (2.5x NET), review screening.
  - 📣 Notify after: a **clean PASS** → approve & alert leasing manager (address, net qualifying income, avg credit).
  - 🛑 PM/Owner: **PM pulls screening manually & owns final approval**; criminal/credit judgment calls → PM. **Everything that isn't a clean pass or a clean auto-decline → escalate** (cures and exceptions are PM/Owner decisions, never promised).
- **Output:** One of — **Approved, terms ready** (completion email sent) · **Auto-decline** (adverse-action letter issued, app labeled rejected, letter attached) · **Escalated** package to PM/Owner. Every step logged in Aptly.
- **Handoff:** → `lease-prep-signing` on approval; or close out (adverse action); or hold pending PM/Owner.

---

## 4. 🟧 Decision gate (approve / auto-decline / escalate)
- **Trigger:** Screening complete.
- **Skills:** `applications-screening` (decision) → routes onward.
- **Hook Gates:**
  - 📣 Notify after: clean approval.
  - 🛑 Always escalate: any miss, correctable/cure case, low credit/income, or any **risky denial** (fair-housing/legal exposure). Set/quote no terms, concessions, or price alone.
- **Output:** Routed decision with the specific criterion (and value) cited; adverse-action notice on any report-based denial.
- **Handoff:** Approved → stage 5. Denied → adverse-action close-out. Exception → PM/Owner.

---

## 5. 🟪 Lease prep & signing
- **Trigger:** Applicant approved, terms ready.
- **Skills:** `lease-prep-signing`.
- **Hook Gates:**
  - 📣 Notify after: send contract terms for acceptance; collect the **$1,500 earnest/holding deposit** (Rentvine), then take the home off-market; build lease, send for e-signature (all adults sign).
  - 🛑 Escalate: any higher-deposit/term change beyond the auto terms → PM sign-off (PM who ran the app signs off).
- **Output:** Terms accepted → Move-Ins board; lease fully executed (all signatures); Rentvine charges set; **signed lease filed as PDF** (`PropertyName_Lease_YYYY-MM-DD.pdf`) in `Leases/`.
- **Handoff:** **Funds before keys** — earnest + first month cleared before any key released; move-in inspection; hand off to **Property Management**; leasing file closed.

---

**Standing NEVERs (all stages):** never respond/coordinate outside 8am–8pm AZ (automated excepted) · never vary criteria, process, or terms by protected class (fair housing) · never make promises (holds, repairs, terms, deposit, co-signer) · never approve/deny/quote/negotiate price or terms without PM sign-off · never approve on incomplete screening or before all co-applicants apply · never process an application with no in-person showing · never refund the application fee · never decide a cure/exception alone · never hand keys before cleared funds · never expose an applicant's/tenant's personal or financial data.
