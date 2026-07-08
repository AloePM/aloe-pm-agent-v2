---
name: vendor-coordination
description: "ALWAYS use this after a vendor has been dispatched in Aptly to track confirmation, monitor SLA, and verify the work is genuinely done before closing the ticket. Covers the follow-through half of vendor dispatch: vendor accepted, showed up, did the actual work, confirmed against the original complaint with evidence. Works alongside vendor-dispatch (which handles the Aptly assignment) and work-order-triage (which sets urgency). Ari proposes every outward message — vendor texts and resident updates are drafted for human approval first."
---

# Vendor Coordination — Aloe Property Management (Ari)

Ari uses this skill for the follow-through half of vendor dispatch. `vendor-dispatch` handles putting the vendor on the Aptly work order. This skill tracks that the vendor actually accepted, showed up, did the real work, and that the outcome is confirmed before the ticket closes.

Dispatching is the easy half. This skill enforces the hard half.

---

## Vendor-First Rule (Never Break This)

Confirm with the vendor BEFORE notifying the resident of a time window. Order:

1. Vendor is assigned in Aptly (via `vendor-dispatch`)
2. Ari confirms the vendor accepted and has a real window
3. **Only then** notify the resident with a time the vendor has actually committed to

Telling a resident "a tech is coming Tuesday" before the vendor has confirmed sets up a broken promise. The resident hears it as a commitment. Never make that promise until the vendor has accepted.

---

## Step 1 — Confirm Vendor Acceptance

After the Aptly dispatch, track whether the vendor has accepted:

| Status | What it means | Ari's action |
|--------|--------------|--------------|
| Accepted | Vendor confirmed with a window | Notify resident with the window |
| Declined | Vendor cannot take the job | Re-select and re-dispatch via vendor-dispatch |
| Awaiting | No response yet | Follow up per SLA ladder below |
| No-response | Silent past the response window | Treat as not confirmed; re-dispatch |

A silent vendor is not an accepted vendor.

---

## Step 2 — Notify the Resident (After Acceptance Only)

Once the vendor has accepted with a confirmed window, draft the resident notification for human approval. Include:
- What is being fixed
- The confirmed time window (not a range the vendor didn't agree to)
- Access instructions if needed

Draft goes to the PM for approval before it goes to the resident via Quo SMS or Aptly message.

---

## SLA Tracking

Use the urgency tier from `work-order-triage` to set the clock:

| Tier | Vendor response window | Completion target | Escalate if breached |
|------|----------------------|-------------------|---------------------|
| Emergency | 1 hour | Same day | Immediately to Roberto / Randi |
| Urgent | 4 hours | Next business day | End of business day |
| Routine | Next business day | Within 5 business days | After 2 business days |

**Vendor no-show:** Follow up same day. Reschedule. Flag repeat no-shows to Roberto as a vendor performance issue.

**Job open past completion target:** Surface the breach with how long it has been open and what is blocking it. Roberto is the Project Supervisor for escalation on stuck jobs.

---

## Step 3 — Close-the-Loop Verification

Do not close a work order on "the vendor said it is done" or "it looks done." Confirm the real outcome — the thing the resident actually needed.

**Close criteria:**
- Verify against the original complaint. If the ticket was "AC not cooling," the close criterion is "unit is cooling to set temperature," not "HVAC tech visited."
- Prefer evidence: completion photo of the working result, resident confirmation, or tech note describing the tested outcome.
- "Powered on," "looks good," and "should be fixed" are NOT verification.

**If the work cannot be verified:** the ticket stays open. Flag for Roberto or the PM rather than closing on faith.

**Watch for partial fixes:** A vendor noting what they found is not confirming what they fixed. Read the note for the actual outcome.

**Rentvine work order status:** Update to Closed (status 3) only after real outcome is confirmed. Status 4 (OnHold) if blocked pending parts or follow-up.

---

## Step 4 — Close the Work Order

Once the real outcome is verified:
1. Update the Rentvine work order status to Closed (3)
2. Update the Aptly card status
3. Log the outcome, the vendor who did the work, and the verification evidence
4. If tenant-caused damage was identified during the repair, flag it for Ari to pass to the turnover-coordination chargeback feed

The close, like every outward step, is surfaced for human sign-off before execution.

---

## Vendor Performance Tracking

Track per vendor over time:
- Acceptance rate
- SLA breach count
- Completion verification pass rate
- Repeat no-shows

A vendor who repeatedly breaches SLA or fails verification is a selection signal. Flag to Roberto for vendor directory review.

---

## What It Plugs Into

- **vendor-dispatch** — handles the Aptly assignment; this skill picks up after dispatch
- **work-order-triage** — sets the urgency tier and SLA clock
- **propose-first-operator** — all outward messages (vendor texts, resident updates, close notifications) are proposals for human approval
- **turnover-coordination** — any damage found during repair feeds the chargeback list

---

## Output for Each Job

- Vendor acceptance status: accepted / declined / awaiting / no-response
- Scheduled window (only after vendor-confirmed)
- Resident notification draft (awaiting approval, only after acceptance)
- SLA status: on-track / response-breach / completion-breach
- Verification status: verified with evidence / unverified → stays open
- Rentvine WO status update (proposed, awaiting human sign-off)
- Recommended next action

---

## Validation

- Resident was not notified of a window before the vendor confirmed.
- SLA clock was set from work-order-triage urgency tier.
- Work order was not closed on "vendor said done" — verified against original complaint.
- Verification evidence is cited (photo, resident confirm, tech note with tested outcome).
- All outward messages were drafted for human approval before sending.
- Rentvine and Aptly status updated only after close is confirmed.
