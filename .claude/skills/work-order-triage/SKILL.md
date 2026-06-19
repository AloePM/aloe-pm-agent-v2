---
name: work-order-triage
description: ALWAYS use this when triaging, prioritizing, or assigning urgency to a maintenance request, repair, or work order at Aloe Property Management. Use it the moment any tenant/owner/vendor message describes something broken, leaking, not working, unsafe, or needing repair — BEFORE assigning a priority, deciding response time, dispatching a vendor, or authorizing a cost. Covers Emergency/Urgent/Routine classification, SLA deadlines, escalation exceptions, the troubleshoot-vs-dispatch decision table, and the cost-authorization rule (WO maintenance amount, $350 default). Do not guess urgency, send a tenant a fix, or authorize a vendor price without it.
---

# Work Order Triage — Aloe Property Management

Classify every maintenance/repair request into one of three urgency tiers, apply
the right SLA, check for escalation factors, and recommend the next action.

## Triage steps

1. **Read the issue** — what's broken, where, and who reported it.
2. **Landscaping, pool, or pest control? Check included services FIRST** (see
   below) — if the service is owner-provided/included, it's **not** a tenant
   work order: route it, don't dispatch or triage.
3. **Check escalation factors** (see below) — they can raise the tier.
4. **Assign the tier** using the definitions below.
5. **Apply the SLA** for that tier.
6. **Output**: the assigned tier, a one-line justification citing the rule that
   drove it, and a recommended next action (who to dispatch / what to do now).
7. **If key facts are missing, STOP and ask** — never assign a tier on a guess.

## Included / owner-provided services — check FIRST (landscaping · pool · pest)

Before triaging any work order for **landscaping, pool service, or pest
control**, check the **property maintenance notes in Aptly/Rentvine** to see
whether that service is **owner-provided or included.** If it is:

- **Do NOT dispatch a separate vendor**, and **do NOT treat it as a tenant
  issue.**
- Instead, **contact the included service provider directly** or **notify the
  owner.**

Only if the service is **not** owner-provided/included do you triage it as a
normal work order.

## Urgency tiers

### 🔴 Emergency — respond within 2 hours, 24/7
Respond and dispatch **within 2 hours**, any hour (including nights/weekends);
aim for a vendor on-site fast and resolve as soon as possible (target within
24 hours).

Classify as Emergency when the issue is any of:
- **Safety / health threat** — gas leak, fire, no heat in winter, sewage
  backup, exposed/sparking wiring.
- **Active property damage** — active water leak, flooding, or burst pipe where
  damage is spreading now.
- **Security / habitability** — broken exterior door or lock, no working
  smoke/CO detector, unit not safe to occupy.
- **Total loss of an essential service** — no water, no electricity, or no
  working toilet in a single-bathroom unit.

### 🟠 Urgent — accept within 1 business day
**Most work orders land here.** Accept/acknowledge the work order **within 1
business day**; resolve within **48 hours**.

Typical Urgent issues:
- Major appliance failure (fridge, stove; AC out in mild weather).
- Partial service loss (one of two bathrooms down; slow leak with no active
  damage).
- HVAC out in non-extreme weather.
- Significant pest / infestation affecting habitability.

### 🟢 Routine — accept within 1 business day
Accept the work order **within 1 business day**, then schedule and complete
within ~1 week. Minor, non-urgent repairs (cabinet hinge, paint touch-up, minor
cosmetic fixes).

## Escalation exceptions (check BEFORE assigning a tier)

These bump urgency **up**, often turning an Urgent into an Emergency:

- **Vulnerable tenants** — elderly, disabled, or infants in the unit: escalate
  any heat, AC, or water issue.
- **Extreme weather** — during a heat wave or freeze, loss of HVAC or water is
  an **Emergency**, not Urgent.
- **Recurring / repeat issue** — the same problem reported again: bump the
  priority up a tier.

## Troubleshoot vs. dispatch

**We always dispatch a vendor — we never ask a tenant to perform an actual
repair.** The only thing a tenant may be asked to do first is a **simple, safe
reset/relight/diagnostic step** (push a reset button, relight a pilot, replace
batteries, flip a breaker/GFCI, try a new bulb). If that resolves the issue, no
vendor is needed. Anything beyond a basic reset → **dispatch a vendor.**

### 💧 Water rule — ALWAYS shutoff + dispatch, together
For **any water-related issue** — leaking disposal, leaking sink, leaking
toilet, water heater leak, or **any active water** — **immediately send the
tenant shutoff instructions AND dispatch a vendor at the same time.** Shutoff is
damage-mitigation, not a repair, so it always applies (it is not "asking the
tenant to fix it").

- **Shutoff steps:** shut off the valve under the affected fixture first; if
  there's no valve, or the valve won't stop the water, use the **main water
  shutoff.**
- Shutoff and dispatch happen **at the same time — never one instead of the
  other.** The goal is to stop water damage while the vendor is en route.
- There is **no "skip troubleshooting" path for water** — water always gets
  shutoff steps *and* a vendor.

Use this decision table. "Dispatch now" means skip the reset/troubleshoot steps
and send a vendor; for **water rows (marked 💧)**, shutoff instructions still go
out alongside the dispatch.

| Symptom | Action |
|---|---|
| 💧 Garbage disposal **leaking** | **Shutoff + dispatch now** (needs replacement) |
| Garbage disposal **humming** | Reset/relight first → reset button, clear jam; dispatch if unresolved |
| 💧 Water heater **leaking** | **Shutoff + dispatch now** (needs replacement) |
| Water heater **not lighting** | Reset/relight first → relight pilot; dispatch if unresolved |
| 💧 Toilet **leaking at base** | **Shutoff + dispatch now** |
| 💧 Toilet **running constantly** | **Shutoff + dispatch now** (shut valve behind toilet) |
| **No hot water** anywhere | **Dispatch now** (no leak — no shutoff needed) |
| 💧 **Faucet dripping** | **Shutoff + dispatch now** (valve under sink) |
| Outlet **sparking / burning smell** | **Dispatch now** (safety — also Emergency) |
| **Breaker won't reset** (re-trips) | **Dispatch now** |
| Dead outlet / circuit | Reset first → check breaker/GFCI; dispatch if unresolved |
| Light fixture flickering | Reset first → try a new bulb; dispatch if unresolved |
| AC blowing warm / not cooling | **Dispatch now** |
| Fridge not cooling | **Dispatch now** (food-safety) |
| Dishwasher not draining | Reset first → run reset cycle; dispatch if unresolved |
| Thermostat blank | Reset first → batteries / check breaker; dispatch if unresolved |
| Washer won't start | Reset first → check door latch / reset; dispatch if unresolved |
| Broken exterior lock / door | **Dispatch now** (security) |
| Oven / stove not heating | **Dispatch now** |
| 💧 Ceiling / roof water stain | **Shutoff + dispatch now** (main shutoff if active; leak from above) |

When a symptom isn't listed: if it could plausibly be fixed by a single safe
reset, offer that step first; otherwise **dispatch.** When in doubt, dispatch.

## Cost authorization (standing rule)

- **The authorization limit is the maintenance amount on the work order** in our
  software (Aptly) — this is the primary limit and varies per WO. **When the WO
  specifies no amount, the default limit is $350.**
- **Dispatch is by assigning the vendor in Aptly, which auto-sends the work
  order** (see the **vendor-dispatch** skill) — we do not manually text or call
  the vendor for the initial dispatch.
- **If the vendor's price exceeds the limit (the WO maintenance amount, or $350
  by default), get owner approval before authorizing the work.** Within the
  limit, proceed.
- Emergencies still dispatch first regardless (per the NEVER rules) — the
  threshold governs authorizing the *cost*, not the initial emergency dispatch.

## Good output looks like

> **Urgent** — fridge out in a unit with no vulnerable tenants and mild weather;
> partial-but-significant service loss. **Next:** acknowledge tenant today,
> dispatch appliance vendor for on-site within 48h.

Always include: (1) the tier, (2) a one-line justification citing the rule, and
(3) the recommended next action.

## NEVER do this

- **Never downgrade a safety, health, or habitability issue below Emergency** —
  when in doubt on safety, it's an Emergency.
- **Never delay Emergency dispatch waiting for owner approval** — dispatch
  first; inform the owner immediately after.
- **Never put tenant personal or financial details in vendor-facing output** —
  give vendors only what they need to do the job.
- **Never guess a tier on missing information** — flag the gap and ask before
  classifying.
- **Never dispatch a vendor or treat landscaping/pool/pest as a tenant issue
  without first checking whether the service is owner-provided/included** — if it
  is, route to the included provider or notify the owner.
- **Never ask a tenant to perform an actual repair** — only simple, safe resets;
  everything else gets a vendor dispatched.
- **Never skip shutoff instructions for a water issue, and never send them
  instead of dispatching** — for any leak/active water, shutoff steps and the
  vendor dispatch always go out together.
- **Never authorize work over the threshold without owner approval first** — over
  the WO maintenance amount (or $350 when none is noted) requires owner sign-off
  before the vendor proceeds.

## Test scenarios

Use these to sanity-check the skill's behavior.

### 1. Emergency
> "Tenant at MapleSt-204 called — water is pouring from the ceiling and
> flooding the kitchen floor."

Expected: **Emergency** (active property damage, spreading now). Respond and
dispatch a plumber within 2 hours (24/7); resolve within 24h. Inform the owner
right after — do not wait for approval.

### 2. Routine
> "Tenant mentioned a kitchen cabinet hinge is loose and the door sags a bit."

Expected: **Routine** (minor cosmetic/non-urgent repair). Accept within 1
business day; schedule/complete within ~1 week and bundle with the next
maintenance visit.

### 3. Escalation — vulnerable tenant
> "AC stopped working at OakwoodPlaza unit 12. Weather is mild today, but the
> tenant is elderly and lives alone."

Expected: **escalate to Emergency.** AC out in mild weather would normally be
Urgent, but the vulnerable-tenant exception (elderly) bumps any heat/AC/water
issue up. Dispatch HVAC immediately; resolve within 24h. Note the escalation
reason in the justification.

### 4. Water issue — shutoff + dispatch together
> "Tenant says the garbage disposal is leaking underneath."

Expected: **Shutoff + dispatch, at the same time.** Send the tenant shutoff
steps immediately (valve under the sink; main shutoff if that doesn't stop it)
**and** dispatch a vendor — a leaking disposal needs replacement. Shutoff is
damage-mitigation, not a repair. (Tier per SLA: typically Urgent; Emergency if
water is actively spreading/damaging.)

### 5. Simple reset first
> "Tenant reports the garbage disposal just hums and won't spin."

Expected: **Simple reset first** — send the safe steps (press the reset button,
clear any jam). If that doesn't resolve it, dispatch a vendor. Never ask the
tenant to do more than the basic reset.

### 6. Cost authorization
> "Vendor called from the job — the water heater replacement will run $900."

Expected: **$900 is over the $350 threshold → get owner approval before
authorizing.** Unless the work order itself notes a higher authorization amount,
do not tell the vendor to proceed until the owner signs off.

### 7. Should NOT trigger this skill
> "Can you draft this month's owner update for OakwoodPlaza?"

Expected: **No triage.** This is an owner-communication task, not a maintenance
request — nothing is broken, leaking, or unsafe. Do not classify urgency; use
the owner-update template instead.
