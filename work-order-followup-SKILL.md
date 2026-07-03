---
name: work-order-followup
description: ALWAYS use this when following up on a SCHEDULED work order at Aloe Property Management — confirming an appointment, sending reminders, or checking whether work was completed. Use it the moment a work order has a vendor and a scheduled date and you need to communicate with the tenant or vendor about it, OR when checking in after the appointment. Covers confirmation, day-of reminders, post-job completion checks, exception handling, and the messages to send. Do not draft tenant/vendor follow-up by guesswork — use this skill.
---

# Work Order Follow-Up — Aloe Property Management

Once a work order is scheduled (vendor + date set), drive it to a confirmed
close through three touchpoints: **confirm → remind → verify completion.**
Never let a scheduled work order go silent.

## Follow-up steps

### 1. Confirm — right after scheduling
Send a confirmation to **both the tenant and the vendor**. Include:
- **Date and arrival time window.**
- **Access instructions** — entry details, pets, parking, who to contact on
  arrival.
- **Work order # and a contact** for questions.

(Tailor each message — see Output. Vendor messages exclude tenant private info.)

### 2. Remind — morning of the appointment
Send a reminder to both parties the **morning of** the scheduled day, before the
arrival window.

### 3. Verify completion — next business day
The **next business day** after the appointment, confirm the job actually got
done. (For an **Emergency**, verify the **same day** the vendor reports done —
don't wait for the next business day.)
- **From the vendor:** work completed, notes, final cost, and **a photo of
  the completed work** (before/after where relevant). Do not close without
  vendor confirmation.
- **From the tenant:** the issue is actually resolved and they're satisfied.
  A quick text check-in is enough — one question, not a survey.
- **Notify the owner** if the final cost exceeded the authorization limit,
  if the scope changed from what was originally described, or if the issue
  was larger than expected.
- Only then update status to **Closed** in the tracker and the work-order
  filename.

## Exception handling

When a follow-up surfaces a problem, act — don't just log it:

- **Tenant says it's not fixed** → **reopen** the work order; keep status
  `Open` / `In-Progress`, don't close it.
- **Vendor unreachable** after reasonable attempts → **escalate** or assign a
  backup vendor.
- **Issue has worsened** → re-run the **work-order-triage** skill to set a new
  urgency before proceeding.
- **Vendor unreachable / no-show** → follow the vendor silence ladder in the
  **escalation** skill (Emergency = escalate after 1 hour; Urgent = end of
  business day; Routine = 2 business days). Do not silently re-queue — escalate
  to the PM so a backup vendor can be assigned.

## Good output looks like

- **Separate, tailored messages** for tenant and vendor, in a warm-professional
  tone.
- **Tenant privacy respected** — vendor-facing messages contain only what the
  vendor needs; no tenant personal or financial details.
- **A clear next step with timing** — who does what, by when.
- **A status/tracker line** — the status change and any owner-notify action.

Example:

> **Tenant (MapleSt-204):** "Hi Jordan — confirming Acme Plumbing will arrive
> tomorrow between 9–11am for the kitchen leak (WO #1001). They'll need access;
> reply if the time doesn't work. Questions? Call us at [number]."
>
> **Vendor (Acme Plumbing):** "Confirming WO #1001 at MapleSt-204, tomorrow
> 9–11am — kitchen sink leak. Tenant will provide access; call [office] on
> arrival."
>
> **Status:** WO #1001 → confirmed, reminder set for morning of. Verify
> completion next business day.

## NEVER do this

- **Never let a scheduled work order go silent** — every scheduled WO gets its
  confirmation, morning-of reminder, and completion check. No dropped
  follow-ups.
- **Never assume completion** — don't record work as done based on the schedule
  alone. Confirm with the vendor and tenant before closing.

## Test scenarios

### 1. Confirmation (right after scheduling)
> "Acme Plumbing is booked for WO #1001 at MapleSt-204 tomorrow 9–11am."

Expected: draft **two messages** — tenant (date/window, access reminder, WO #,
contact) and vendor (date/window, scope, access, no tenant private info). Set a
morning-of reminder. Status line: confirmed, verify next business day.

### 2. Completion check reveals a problem
> "Followed up on WO #1001 — tenant says the sink is still leaking."

Expected: **reopen** the work order (keep status `In-Progress`, do **not**
close). Re-confirm with the vendor for a return visit, draft tenant message
acknowledging it's not resolved. If the leak has worsened, re-run
**work-order-triage** for new urgency.

### 3. Should NOT trigger this skill
> "A tenant just reported the garbage disposal is jammed — what priority is
> this?"

Expected: **No follow-up.** Nothing is scheduled yet — this is initial
classification. Use **work-order-triage**, not this skill. (This skill begins
only once a vendor and date are set.)
