---
name: vendor-dispatch
description: ALWAYS use this when assigning or dispatching a vendor to an approved work order at Aloe Property Management. Use it the moment a work order is triaged and ready for a vendor — to run the mandatory pre-dispatch checklist (Aptly maintenance notes: owner's preferred vendor, home warranty, owner-notification flag), pick the vendor, assign them in Aptly, handle emergency dispatch, and apply the cost-authorization threshold. Dispatch happens IN APTLY, never by manual outreach. Do not assign or contact a vendor without this skill.
---

# Vendor Dispatch — Aloe Property Management

Get the right qualified vendor onto an approved work order, dispatched through
**Aptly**, within the cost authority of the work order.

> Prerequisite: the work order has already been triaged (see **work-order-triage**)
> and approved. This skill covers vendor selection and dispatch only.

## Dispatch happens in Aptly

**We dispatch by assigning the vendor in Aptly — the software sends the dispatch
automatically.** We do **not** manually contact the vendor (call/text/email)
outside Aptly for the initial dispatch. Assigning in Aptly *is* the dispatch.

> **Who sets the Vendor field:** dispatch fires when the **Vendor** field is set on
> the work-order card in Aptly. **A person must set that field** — the agent can
> recommend the vendor, prep a dispatch-ready work order, and create/log the card,
> but the actual Aptly vendor assignment must be done by a human until we have
> direct Aptly write access for vendor fields. Don't report a WO as "dispatched"
> until a person has set the Vendor field.

## Pre-dispatch checklist (MANDATORY — runs BEFORE vendor selection)

**Before selecting any vendor, check the property's maintenance notes in Aptly.**
Never skip this. Four things to look for, in order:

1. **Owner's preferred vendor** — if a preferred vendor is listed on the property,
   **use that vendor first, regardless of our standard vendor list.** It overrides
   the trade-preferred selection below.
2.  **Home warranty** — if the property has a home warranty, the claim **must be
   filed through the warranty company before dispatching our own vendor.** Do not
   assign an Aloe vendor unless/until the warranty route is exhausted or doesn't
   cover the issue.

   **Known home warranty and builder warranty companies to recognize:**
   - First American Home Warranty
   - American Home Shield
   - Choice Home Warranty
   - Home Warranty of America
   - Old Republic Home Protection
   - 2-10 Home Buyers Warranty
   - American Home Warranty
   - Builder Warranty (any new-construction coverage)
   - Fidelity National Home Warranty
   - Landmark Home Warranty
   - OneGuard Home Warranty
   - Platinum Home Warranty

   If the property notes mention any of these (or any home/builder warranty),
   set the **Home Warranty field (`3PvcEJoFBQLnjHnd6`) to `Yes`** on the Aptly
   work order card if any of the following vendors are assigned. This flags the card so all staff know
   the warranty route applies. Then file the claim through the warranty company
   — do not dispatch an Aloe vendor until the warranty company assigns one or
   confirms the issue is not covered.
3. **Set both fields in Aptly — this is what triggers dispatch:**

   **When a warranty company is handling the job:**
   - Set `3PvcEJoFBQLnjHnd6` (Home Warranty) = **Yes**
   - Do NOT set a vendor — card stays in current stage, no email fires
   - File the claim through the warranty company directly

   **When dispatching an Aloe vendor (no warranty, or warranty won't cover it):**
   - Set `39gNjdkmpFpoPLzth` (Vendor) = the vendor name Ari recommended
   - Set `3PvcEJoFBQLnjHnd6` (Home Warranty) = **No**
   - **Both fields must be set together** — this is what moves the card to
     "Requested" stage and fires the vendor email automatically
   - If the property HAD a home warranty but it doesn't cover this issue,
     Home Warranty still = **No** on this card (warranty was checked and
     declined — the vendor is handling it)

   Ari proposes the vendor name. A human confirms and sets the fields in Aptly.
   The email and stage change happen automatically once both fields are set.
4. **Owner notification preference** — if the property is flagged "contact owner
   before any dispatch" (applies even to Routine WOs), **text or email the owner
   first and wait for a response before dispatching.**
   - **Emergency exception:** dispatch immediately and notify the owner
     **simultaneously** — never wait on a reply during an emergency.
5. **Included Services (landscaping, pool, pest control)** — for these
   categories, check the Rentvine **"Included Services"** field on the property
   (each service is marked **"Tenant Responsibility"** or **"Owner
   Responsibility"**). If the service is marked **"Owner Responsibility,"** it is
   included and covered — **do NOT dispatch a separate vendor and do NOT treat it
   as a tenant issue**; **contact the included service provider directly or notify
   the owner** instead.

Only after clearing this checklist do you proceed to vendor selection.

## Repair responsibility — owner vs. tenant (check before dispatch)

Confirm who's financially responsible; it sets `Tenant Financially Responsible?`
on the WO and whether the tenant is billed. Key plumbing rules:

- **Garbage disposal leaking → owner responsible.** A leaking disposal needs
  repair/replacement; the owner pays. (Per triage's 💧 water rule, also send
  shutoff steps + dispatch together.)
- **Garbage disposal clog / jam → tenant responsible** (e.g. attempting to clear a
  jam, or resetting the red overheat button — don't dispatch a vendor for these).
- **Leaks from water or drain piping → owner responsible.**
- When responsibility is genuinely unclear, flag it rather than guessing.

## Vendor selection

### Route on the actual problem, not the keyword
Before picking a trade, confirm what the issue actually is. The words a
tenant uses are a starting point, not a diagnosis:

- "Hole in the wall next to the outlet" → **handyman/drywall**, not electrical
  (the outlet works; the wall is damaged).
- "Breaker keeps tripping" → could be one failing appliance, not a wiring fault.
  Identify the cause before assigning an electrician.
- Disposal humming but not spinning → **handyman reset**, not a plumber.

Routing on the keyword instead of the actual problem is the most common way
to send the wrong vendor. When the trade is genuinely unclear, ask one
clarifying question or request a photo before dispatching.

### Vendor hierarchy — cost-saving routing order
Try the lower-cost option first when the scope genuinely fits:

1. **Handyman** — use for minor repairs, drywall, cabinet/door hardware,
   painting, basic appliance resets, and any task that doesn't require a
   license. Handyman-first saves the owner money and is often faster.
2. **Licensed specialist** (plumber, electrician, HVAC tech) — use when
   the job requires a license, a permit, or trade-specific expertise the
   handyman can't provide.
3. **Specialty vendor** (roofing, foundation, restoration) — use when the
   scope is beyond a licensed generalist.

When in doubt whether a handyman can handle it: ask the handyman. They'll
tell you if it needs a licensed trade.

### Selecting the specific vendor
1. **Preferred vendor for the trade** — use Aloe's go-to vendor for the category
   (plumbing, HVAC, electrical, appliance, general, etc.).
2. Weigh **proximity / availability** and **cost / estimate** — closest and
   soonest-available qualified vendor; compare estimates on larger jobs.
3. **Fallback when the preferred vendor isn't available:** go to the **next
   preferred** vendor for that trade, then the **closest available qualified**
   vendor.

The vendor must be qualified (suited/licensed) for the trade and property type.

### Service-area coverage gaps

Our vendor notes are routed by city, and **not every service area has assigned
vendors.** When a property's city isn't covered by the trade's listed vendors,
**flag it as a coverage gap** and confirm the chosen vendor actually services that
area before assigning — don't assume a city-restricted vendor (e.g. "Maricopa
only") will travel.

- **San Tan Valley (ZIPs 85143, 85140, 85142)** — currently **no explicitly
  assigned vendor coverage** in our notes. Treat as a coverage gap: recommend the
  best available trade vendor with no area restriction, confirm they serve San Tan
  Valley, and flag the gap until dedicated vendors are assigned for these ZIPs.

## Dispatch steps

1. **Run the pre-dispatch checklist** (above) — check the property's Aptly notes
   and the Rentvine **"Included Services"** field: preferred vendor, home
   warranty, owner-notification flag, and (for landscaping/pool/pest) whether the
   service is marked "Owner Responsibility." Resolve each before going further.
2. **Confirm the work order is complete** — it must carry the property address,
   unit, access instructions, WO #, scope of work, and the maintenance amount.
3. **Assign the chosen vendor in Aptly.** Aptly sends the dispatch automatically.
4. **Emergencies:** assign in Aptly **AND call the vendor directly to confirm
   they're moving.** (Per triage, emergencies dispatch first, 24/7.)
5. **Cost authorization:** the vendor is authorized up to the work order's
   **maintenance amount** (default **$350** when the WO specifies none). If the
   job will exceed that, get **owner approval before the vendor proceeds.**
6. **Set the follow-up clock (by tier):** Emergency → vendor confirmed / on-site
   within **2 hours**; Urgent and Routine → a **scheduled date within 1 business
   day** (acceptance). If the tier's window passes with no scheduled date, follow
   up (hand to **work-order-followup**).

## Good output looks like

- **Vendor choice + reason** — which vendor and why (preferred-by-trade /
  proximity / cost / fallback).
- **Confirmation the WO is dispatch-ready in Aptly** — address, access, WO #,
  and scope present, so Aptly's auto-dispatch carries everything the vendor
  needs.
- **Cost / approval status line** — the authorization limit (WO maintenance
  amount or $350) and whether owner approval is required.
- **Follow-up note** — expecting a scheduled date within the tier window
  (Emergency 2h; Urgent/Routine 1 business day); flag for follow-up if not.

Example:

> **Dispatch — WO #1001, MapleSt-204 (plumbing):** Assigned **Acme Plumbing** in
> Aptly (preferred plumber, available today). WO carries address, access, and
> scope. **Authorization:** up to $500 (WO maintenance amount). **Follow-up:**
> expect a scheduled date within 1 business day.

## NEVER do this

- **Never dispatch a vendor without checking the property's maintenance notes in
  Aptly first** — preferred vendor, home warranty, owner-notification flag, and
  (for landscaping/pool/pest) the Rentvine "Included Services" field ("Owner
  Responsibility" = covered) are checked before any vendor is selected.
- **Never manually dispatch a vendor outside Aptly** — assigning in Aptly is the
  dispatch; no separate outreach for the initial dispatch. (Emergencies are the
  one exception: assign in Aptly *and* call to confirm.)
- **Never authorize work over the threshold without owner approval** — over the
  WO maintenance amount (or $350 by default) requires owner sign-off first.
- **Never put tenant personal or financial details in the dispatch** — give the
  vendor only what they need to do the job.
- **Never dispatch an unqualified vendor** — must be suited/licensed for the
  trade and property type.
- **Never let a dispatched WO sit past its tier window without a scheduled
  date** — Emergency 2 hours, Urgent/Routine 1 business day — follow up before
  the window closes.

## Test scenarios

### 1. Standard dispatch (under threshold)
> "WO #1001 approved — kitchen faucet repair at MapleSt-204, maintenance amount
> $500."

Expected: select the **preferred plumber** (proximity/availability as tiebreak),
**assign in Aptly** (no manual outreach). Authorization up to **$500**; no owner
approval needed. Expect a scheduled date within 1 business day.

### 2. Over the threshold
> "Preferred HVAC vendor estimates $1,200 to replace the condenser; WO has no
> maintenance amount noted."

Expected: **$1,200 exceeds the $350 default → get owner approval before the
vendor proceeds.** You may still assign the vendor in Aptly, but do **not**
authorize the work until the owner signs off.

### 3. Emergency dispatch
> "Emergency: burst pipe flooding OakwoodPlaza unit 3 — needs a plumber now."

Expected: **assign the plumber in Aptly AND call them directly to confirm
they're moving.** Dispatch first, 24/7; inform the owner in parallel. Use the
preferred plumber, or fall back to next-preferred / closest available if they
can't come immediately. Expect the vendor confirmed / on-site within the
**2-hour** emergency window. (Pre-dispatch checklist still runs, but the owner
is notified *simultaneously* — never wait on a reply.)

### 4. Pre-dispatch checklist catches a flag
> "WO approved — dishwasher repair at OakwoodPlaza unit 7 (Routine)."

Expected: **check Aptly maintenance notes first.** If the property has a **home
warranty**, file the claim through the warranty company before assigning an Aloe
vendor. If an **owner's preferred vendor** is listed, use them over the trade
default. If the **"contact owner before dispatch" flag** is set, text/email the
owner and wait for a reply before dispatching (it's Routine, so no emergency
exception). Only dispatch once the checklist is cleared.
