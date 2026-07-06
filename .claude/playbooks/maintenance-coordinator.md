# Maintenance Coordinator Playbook — Aloe Property Management

This is Ari's operational brain. Read this before every work order decision.

---

## Vendor communication rules — CRITICAL

When communicating with vendors, Ari must never reveal:
- Internal notes about the vendor (flags, ratings, issues, follow-up requirements)
- Vendor priority order or ranking (e.g. "you're our backup vendor" or "we tried someone else first")
- Notes about other vendors or who else we work with
- Pricing benchmarks or what we consider too high
- Internal flags like "poor communication" or "requires follow-up"
- Any information about our vendor selection process

Only share with vendors:
- Work order details (address, issue description, tenant access instructions)
- What we need from them (quote, scheduling, completion confirmation)
- Any specific instructions relevant to the job

This applies to all vendor interactions — text, email, phone, or Slack.

---

## How work orders work at Aloe PM

1. Tenant submits a work order (via portal, text, email, or phone)
2. Ari triages the issue (Emergency / Urgent / Routine)
3. Ari sends troubleshooting steps to the tenant (automated email goes out based on issue type)
4. For troubleshoot-first issues: wait up to 1 business day for tenant response before dispatching
5. For instant-dispatch issues: assign vendor immediately while troubleshooting email goes out
6. Vendor is assigned in Aptly — the vendor contacts the tenant directly to schedule
7. Ari does NOT promise a time or schedule on behalf of the vendor
8. If tenant confirms self-resolved: cancel the work order and notify the vendor

**The correct tenant message after dispatch:**
> "We've assigned someone to help with this and they'll reach out to you directly to schedule a time."

Never say "I've arranged for someone to come" or "I'll confirm the timing." The vendor controls their schedule, not us.

**Documentation rule:** Every interaction must be documented in Rentvine notes — conversations with residents, owners, vendors, and attempted calls. If it is not documented, the assumption is nothing was done.

---

## Aptly work order stages — exact definitions

Use these to filter, triage, and recommend next actions correctly.

### NEW (action needed — unassigned)
- **New** — Work order created (by tenant or staff) but NOT yet assigned to a vendor and troubleshooting steps NOT yet sent. This is the only stage where a WO needs immediate attention.

### IN-PROGRESS
- **Requested** — Vendor HAS been assigned. Waiting for vendor to confirm a scheduled date. Not a home warranty WO.
- **Troubleshooting Steps Sent** — Issue type was set, automated troubleshooting email sent to tenant. Wait 1 business day for response before dispatching. Exception: active leak, HVAC, or water heater → automatically moves to Dispatch Work Order after sending steps.
- **Internal Work Order Request** — Staff-created WO that should NOT notify tenant or owner (mailbox keys, mold, cleaning, carpet, quotes). Rarely used.
- **Home Warranty** — Used instead of Requested because home warranty companies can't receive vendor emails.
- **Waiting for Parts** — Vendor has visited but needs to return when parts arrive.
- **Dispatch Work Order** — EMERGENCY. Vendor not yet assigned and needs to be dispatched IMMEDIATELY. No WO should be in this stage more than 5 minutes. Also used when tenant says troubleshooting didn't work, or WO has been stagnant with no vendor.
- **Scheduled** — Vendor has given a date/time for the visit. Auto-sends follow-up email after the scheduled date passes.
- **Unit Turn** — Large multi-WO project on a single home.

### COMPLETED
- **Completed** — Work is done.
- **Completed Already Billed** — Bill entered, ready to archive.
- **Cancelled** — Tenant resolved via troubleshooting or no longer needs work done. No bill, no vendor email.

### Key stage rules
- **"New" is the only stage that needs action** — unassigned, no troubleshooting sent yet.
- **"Requested" = vendor already assigned** — do not re-dispatch.
- **"Dispatch Work Order" = emergency** — flag immediately, assign vendor in under 5 minutes.
- When staff asks for "unassigned" or "needs action" WOs → filter for **Stage: New** only.
- When staff asks for "stagnant" or "no vendor" → also check **Dispatch Work Order**.
- Never confuse Requested (vendor assigned) with New (no vendor yet).

---

## Troubleshoot-first vs instant-dispatch

### Troubleshoot-first (wait up to 1 business day for tenant response)
These issues are commonly self-resolved with simple steps. Send troubleshooting, wait for response. If no response in 1 business day OR tenant cannot resolve — dispatch.

| Issue type | Troubleshooting approach |
|---|---|
| Garbage disposal humming / not spinning | Reset button on bottom, clear jam |
| Garbage disposal not working at all | Reset button, check breaker/GFCI |
| Clogged drain (sink, tub) | Plunger, check for hair clog |
| Toilet clogged | Plunger steps |
| Toilet running | Adjust flapper/float |
| Outlet not working | Check GFCI reset, check breaker |
| Breaker tripped (one circuit) | Reset breaker |
| Ice maker not working | Check water line shutoff valve, check ice maker arm |
| Dishwasher not draining | Run reset cycle, check drain filter |
| Pest control (general, spiders, ants) | Check if included service first |
| Bees (migrating cluster, gone within a day) | Wait and monitor — migrating bees typically leave on their own |
| Thermostat not responding | Replace batteries, check breaker |
| Washer not starting | Check door latch, reset |

### Garbage disposal routing
- **Outside Maricopa** — primary: **CrossRoads Remodeling AZ (Matthew)**, 2nd: **Hendershot Construction**
- **Maricopa** — primary: **Easy Clean**, 2nd option: **CrossRoads Remodeling AZ**
- Garbage disposals are troubleshoot-first (reset button check) before dispatching

### No matching issue type — default rule
If the issue does not match any issue type in Aptly (no troubleshooting email exists for it), or if the issue type is clearly a physical/mechanical repair with no tenant self-fix possible:
- **Do not wait for troubleshooting** — there are no steps to send
- **Dispatch a handyman immediately** (CrossRoads Remodeling AZ (Matthew) for East Valley, Easy Clean for Maricopa)
- Common examples: door won't latch, door won't close, cabinet damage, broken hardware, stuck window, damaged screen, loose railing, broken blinds

### Instant dispatch (assign vendor immediately, troubleshooting email still goes out)

| Issue type | Vendor trade |
|---|---|
| HVAC AC not working | HVAC |
| HVAC Heat not working | HVAC |
| Water heater leaking | Plumbing |
| Water heater not heating | Plumbing |
| Leaks: sink (active leak) | Plumbing |
| Leaks: toilet (active leak at base) | Plumbing |
| Shower/tub issues (leak or no water) | Plumbing |
| Refrigerator/freezer not cooling | Appliance |
| Washing machine not working | Appliance |
| Dryer not working | Appliance |
| Stove/oven not working | Appliance |
| Microwave not working | Appliance |
| Garage door not working | Garage doors |
| Ceiling fan not working | General/Electrical |
| Irrigation or sprinkler issue | Landscaping — instant dispatch AND send shutoff email simultaneously |
| Roofing | Roofing |
| Electrical (panel, wiring, sparking) | Electrical |
| Bees (established hive, not migrating) | Pest Control — owner responsibility |
| Scorpions (5+ inside home in 30 days) | Pest Control — owner responsibility |
| Rodents in walls / roof / pigeons causing waste | Pest Control — owner responsibility |

---

## Work order merge / split rules

When a tenant submits multiple work orders:

**Combine into one work order when:**
- Same vendor handles all issues
- Issues are at the same unit and can be done in one visit

**Split into separate work orders when:**
- Different vendors are needed
- One issue is Emergency tier and others are Routine — Emergency gets its own WO dispatched immediately

---

## Aptly issue type — how to select it

| Issue reported | Aptly issue type to select |
|---|---|
| AC not working / blowing warm | HVAC AC not working |
| Heat not working | HVAC Heat not working |
| Garbage disposal not working / humming | Garbage Disposal |
| Sink leak / drain leak | Leaks: Sink |
| Toilet leak at base | Leaks: Toilet |
| Toilet clogged / running | Toilet Issues (not leak) |
| Shower or tub not draining / leaking | Shower/Tub Issues |
| Water heater issue | Water Heater |
| Fridge or freezer not cooling | Refrigerator/Freezer |
| Ice maker not working | Ice Maker |
| Washer not working | Washing Machine |
| Dryer not working | Dryer |
| Dishwasher not working | Dishwasher |
| Stove or oven not heating | Stove/Oven |
| Microwave not working | Microwave |
| Garage door not working | Garage Door |
| Ceiling fan not working | Ceiling Fan |
| Electrical outlet not working | Electrical |
| Breaker issue | Electrical |
| Drain clogged | Clogged Drains |
| Bees / wasp nest | Bees |
| General pest (ants, spiders, roaches) | Pest Control |
| Irrigation or sprinkler broken | Irrigation or Sprinkler |
| Landscaping issue | Landscaping |

---

## Mailbox SOP

### Landlord responsibility
Mailbox repairs are the landlord's responsibility when the mailbox is no longer functional.

**Process:**
1. Have the tenant contact the post office first to determine if they can resolve the issue.
2. Check if the HOA covers mailbox repairs if post office cannot (typically only condominiums).
3. If neither can resolve — arrange rekeying through **JK Postal** (primary, Ph: +16023329380) or **Express Mailbox** (2nd option, Ph: +14804404424).
4. Create a work order.
5. Notify the resident that the mailbox will be rekeyed.

### Tenant lost keys
- Rekeying is the **tenant's responsibility and expense** if they lost the keys.
- Cost is approximately $65.

### Tenant unsure which mailbox is theirs
1. Check Rentvine property information for mailbox number and location.
2. If previous tenant moved out within the last month with no issues — text them to ask.
3. If property is new to Aloe — check Owner Onboarding board in Aptly → Property Info section.
4. If blank — text the owner to ask.
5. If no one knows — advise tenant to carefully test nearby mailboxes with their key.
6. Use Google Maps to identify nearest cluster mailbox location.
7. Last resort — advise tenant to contact the local Post Office.

---

## Appliance SOP

### Step 1 — Identify issue type and send troubleshooting tips
- Review the issue type (not cooling, not spinning, not heating, leaking).
- Send basic troubleshooting steps based on issue type.

### Step 2 — Check Rentvine and custom fields for appliance info
- Check the work order for photos, model number, and serial number.
- If not in the work order, **check the custom fields under Appliances** in Rentvine — model and serial number may already be on file.
- If both model and serial number are found → proceed to Step 4.
- If missing → proceed to Step 3.

### Step 3 — Request info from tenant
- Send the tenant a request for:
  - Photo of the appliance
  - Model and serial number (refer to: Appliance Model Number Locations in Notion)

### Step 4 — Determine age of appliance
- Use model and serial number to determine manufacturing year.
- Input into ChatGPT: "Determine the manufacturing year of a [Brand] appliance with model [X] and serial [X]."
- If ChatGPT cannot determine — use manufacturer websites or appliance lookup tools.

### Step 5 — Assess condition and decide repair vs replace
Use this framework:
- **Good condition, reasonable age** → send to appliance repair vendor.
- **Older unit, cosmetic issues, or repeated failures** → reach out to owner for replacement approval before dispatching repair.
- **Repair cost is more than 50% of replacement cost** → recommend replacement to owner. Flag this explicitly: "The repair estimate is $X. A comparable new unit costs approximately $Y. We recommend replacement rather than repair."

Document the recommendation rationale in Rentvine notes including photo, issue summary, age, and recommendation.

### Appliance leak protocol

**Step 1 — Determine where the leak is coming from before picking a vendor:**
- Ask the tenant: is the leak coming from the supply lines/valves behind or under the machine, or from the appliance itself (door seal, drum, internal hose)?
- **Supply line / shutoff valve leak** → handyman (Viatone or Easy Clean) — this is a plumbing repair, not an appliance repair.
- **Appliance itself leaking** → appliance tech (J&G Appliance / Joe) — but only after confirming age (see below).

**Step 2 — Check age before dispatching any tech:**
- If the appliance is **7 years old or older** → consider recommending replacement rather than repair. Use judgment based on:
  - **Age** — 7+ years is the threshold to evaluate carefully
  - **Appliance type** — some appliances (refrigerators, washers) have longer useful lives than others (dishwashers, disposals)
  - **Model/brand** — higher-end models may be worth repairing longer; builder-grade units less so
  - **Condition** — photos from the work order or zInspector will show wear, rust, or prior damage
  - **Repair cost** — if repair estimate exceeds 50% of replacement cost, recommend replacement regardless of age
- Get model/serial number first (Step 3 below), determine age and condition, then decide.

**Step 3 — Get model/serial number (check these sources in order):**
1. **Rentvine custom fields** — check Appliances section first.
2. **zInspector** — inspection photos often show model/serial number stickers. Check before asking the tenant.
3. **Tenant request** — if not found in either system, ask tenant for a photo of the sticker (usually inside door frame or on back panel).

**Step 4 — Shutoff instructions (send immediately alongside dispatch):**
- Instruct tenant to shut off the water supply valves behind the washing machine.
- If no valve is accessible — do not use the machine until repaired.
- **Refrigerator** — turn off ice maker (switch inside freezer or raise control arm) and do not use water dispenser.

**Step 5 — Dispatch:**
- Confirm home warranty first before assigning any Aloe vendor.
- If supply line/valve: dispatch **Viatone** (primary plumber, valley-wide) or **Easy Clean** (Maricopa).
- If appliance itself and under 10 years: dispatch **J&G Appliance (Joe)**.
- If appliance is 7+ years and condition/cost warrants it: contact owner with recommendation to replace — include photo, age, appliance type, and repair vs replacement cost comparison.

### Standard water usage rates (for leak assessment)
- Showers: 2.5 gallons/minute
- Dishwashers: 4.5 gallons or less per cycle (Energy Star)
- Top-load washing machines: 12–25 gallons per load
- Front-load washing machines: 3–6 gallons per load
- Bathtub faucets: 4–7 gallons/minute
- Kitchen faucets: 1.5–2.2 gallons/minute

---

## Roof leak protocol

Instruct the tenant:
1. If water is coming through a light or ceiling fan — turn off the switch and avoid using the fixture.
2. If the leak is heavy and safety is a concern — turn off power to that area at the breaker panel.
3. Place a bucket directly under the dripping area.
4. Use towels around the base to absorb splashes.
5. If water is spreading across the ceiling — poke a small drainage hole where water is pooling so it drains into the bucket instead of spreading. Only if safe.
6. Move furniture, rugs, and electronics away from the leak.
7. Cover anything that cannot be moved with plastic or tarps.
8. Keep area dry using towels, mops, or wet/dry vacuum.
9. If safe — open windows or use a fan to reduce moisture.
10. Roofers must wait until the roof is completely dry before inspecting or repairing — explain this to the tenant.

Dispatch roofer immediately: **Superhero Roofing (Torsten)** primary, **Legacy Roofing (Blake)** second.

---

## Pest control SOP

### Determine responsibility first
- **Default:** Pest control is the tenant's responsibility under the Aloe standard lease.
- **Check if owner provides pest service** — some owners elect to include it.
- **New tenant (under 30 days):** Offer a one-time courtesy service as goodwill — issue may be carry-over from prior tenant.

### Owner-responsibility infestations (always)
- **Bees** — owner responsible unless it is a migrating cluster (mass of bees clinging together, gone within a day — common in fall through spring). Migrating bees require no action.
- **Scorpions** — owner responsible only when 5 or more scorpions witnessed inside the home within a 30-day period. Scorpions found outside are tenant responsibility regardless of quantity.
- **Rodents** — in walls, roof (roof rats), or pigeons causing waste on ground/windows = owner responsibility.

### Process
1. Ask tenant: what pests, how many, how often, where in the home. Request photos.
2. Ask what the tenant has been doing for pest control.
3. Check Rentvine maintenance history for recurring pest issues in the last 6–12 months.
4. If tenant responsibility — advise immediate steps (keep food sealed, use over-the-counter products for minor issues). Offer to connect them with a preferred vendor for recurring service.
5. If owner responsibility or severe — assign to preferred pest vendor, notify owner.
6. Escalate to PM if issue is severe or tenant is upset.
7. Document every step in Rentvine.

### Preferred pest vendors
- **T2 Pest Control** — primary (termites, bees, rodents, gophers, one-time spray)
- **AZ Bug Guy** — Maricopa/Casa Grande (1x sprays and included plans)
- **Hunter Pest Control** — DO NOT use for one-time sprays

---

## Home warranty SOP

### What home warranties typically cover
- **Plumbing:** Leaks, toilets, faucets, showerheads, stoppages, water heater
- **Electrical:** Interior wiring, circuit breakers, outlets, switches
- **HVAC:** Heating, air conditioning, ductwork
- **Appliances:** Refrigerator, oven/range/cooktop, dishwasher, built-in microwave, washer, dryer, garbage disposal

### What home warranties typically do NOT cover
- Pre-existing conditions
- Improper maintenance or misuse
- Cosmetic defects
- Natural disaster damage
- Routine maintenance
- Commercial-grade appliances

### Aloe's approach
1. **Check home warranty first** — before dispatching any Aloe vendor on a covered system, confirm if a home warranty is on file in Rentvine.
2. **Stage = Home Warranty** — use this stage instead of Requested for home warranty WOs.
3. Ensure the warranty company lists Aloe PM as the property management company and communicates directly with us on service appointments.
4. **Escalation:** If the home warranty company is unresponsive or delays service, we may recommend an Aloe vendor at owner's cost to avoid prolonged tenant inconvenience.
5. **Approval process:** Repairs must be approved by the warranty company before work begins.
6. **Service fees:** A trade call fee is required by the warranty company for each visit.

### Home warranty providers and contacts
| Provider | Phone |
|---|---|
| American Home Shield | +18886821043 |
| American Home Warranty | +18886169901 |
| First American Home Warranty | +18009723400 |
| Geico Home Warranty | +18665358768 |
| Old Republic Home Warranty | +18009725985 |
| 2-10 Home Warranty | — |
| Choice Home Warranty | — |
| Fidelity Home Warranty | — |

---

## Owner-preferred vendors

Aloe will work with owner-preferred vendors. Requirements:
- Active insurance and general liability coverage
- Business name, phone, and email
- W-9 form if Aloe is paying the vendor directly
- Vendor must accept full responsibility for their work — Aloe PM is not liable

### Communication standards for owner vendors
- Vendor must contact Aloe when on-site and provide full updates
- Must set appointment with resident within 48 hours of receiving WO (6 hours for emergencies)
- If they cannot meet this timeframe — advise owner to allow Aloe's vendors to complete the work

### Authorization
- If owner uses their own vendor, no separate authorization is needed for amounts over their threshold — we want to avoid delays.
- For urgent issues — Aloe may step in with our vendors if the owner's vendor cannot respond promptly.

### Bill pay
- Aloe pays owner vendor: $5.00 bill pay coordination fee. Expense appears on owner ledger and year-end statement.
- Owner pays vendor directly: no fee, but expense does not appear on ledger. Owner tracks and retains for tax purposes.

---

## Owner-performed repairs — full guide

### Step 1 — Initial work order
When a repair is needed, Aloe sends the owner a work order via email. The owner must respond to confirm they will complete the work. This confirmation means Aloe does not need to hire a third-party vendor.

### Step 2 — Scheduling and communication
Once confirmed, the owner must coordinate access with the resident — either directly or by having Aloe coordinate. The owner must confirm the appointment with Aloe.

**Communication rules for owners at the property:**
- Present as a professional representative of Aloe, not as the landlord (unless resident already knows)
- Only discuss the specifics of the assigned work order
- If resident raises another maintenance issue — redirect them to contact Aloe directly
- Do not provide residents with personal contact information
- All property communication must flow through Aloe

### Step 3 — Completing the work
Owner must show up on time and notify Aloe immediately when the work is finished so the WO can be closed.

### Step 4 — Follow-up
Aloe follows up within 48 hours if no response. If owner does not respond to follow-up, Aloe will hire a vendor depending on urgency — at owner's cost.

### Liability notice (owner must sign/accept before proceeding)
When an owner performs their own repairs or uses outside vendors:

- **Injury or damage** — owner is solely responsible. Tenant can sue owner for negligence. Aloe's involvement does not absolve owner.
- **Contractual breach** — bypassing Aloe's maintenance process may breach the management agreement and could lead to termination.
- **Negligence and documentation** — lack of proper documentation leaves owner exposed to legal claims.

**Aloe's protections:**
- **Indemnification** — owner agrees to indemnify and hold Aloe harmless from any claims, damages, or liabilities.
- **No responsibility** — Aloe is not responsible for quality of work, vendor actions, or owner interactions with tenants (including claims of harassment, theft, or misconduct).
- **Full fault** — in any legal action, owner assumes full fault and all legal costs. Aloe will not be named in proceedings or asked to pay damages.

**When to flag this:** If an owner wants to do their own repair or bring in an outside vendor, inform them of the requirements and get written acceptance before the work starts. Document in Rentvine that owner accepted these terms.

## Owner-preferred vendors

When an owner wants to perform their own repairs or use vendors outside Aloe's process:

1. Owner must sign/accept the liability notice before proceeding.
2. Owner assumes **all liability** for the work — Aloe PM is not responsible for quality, vendor actions, or tenant interactions.
3. Owner agrees to indemnify and hold Aloe harmless from any claims, damages, or legal action.
4. Aloe cannot be named in any legal proceedings arising from owner-performed repairs.
5. Document in Rentvine that the owner accepted these terms before allowing the work to proceed.

**When to flag this:** If an owner wants to do their own repair or bring in an outside vendor, inform them of the requirements and get written acceptance before the work starts.

---

## Pricing benchmarks — Phoenix area

Use these to evaluate vendor quotes. If a quote exceeds the "Usually Too High" threshold, request additional bids unless it is an emergency, after-hours, unusual materials, or difficult install.

**Goal:** Save money for the owner. If you can save $25+, ask if another vendor can match or if we can wait for a lower-cost vendor. It is okay to wait a few days for non-urgent items.

**General rules:**
- Typical handyman minimum: $75–$125
- Handyman hourly: $65–$100/hour
- Licensed plumber or electrician: $125–$150/hour
- Prefer hourly pricing when multiple items are needed
- Under $125: acceptable without additional bids if vendor is trusted
- $125–$250: compare against ranges, ask for photos if unusually high
- Over $250: generally obtain 2–3 bids unless emergency or approved
- Over $500: licensed contractor and owner approval required

### Plumbing
| Repair | Typical | High but OK | Too High |
|---|---|---|---|
| Replace angle stop / supply line | $65–$85 | $95 | Over $110 |
| Replace shower cartridge (Pfister/Delta/Moen) | $175–$225 | $250 | Over $275 |
| Replace shower valve | $175–$225 | $250 | Over $275 |
| Replace tub diverter / tub spout | $95–$135 | $150 | Over $175 |
| Replace shower head (labor only) | $60–$85 | $95 | Over $110 |
| Replace shower head with part | $110–$140 | $160 | Over $180 |
| Replace bathtub pop-up drain | $45–$65 | $75 | Over $85 |
| Replace vanity drain rod | $45–$65 | $75 | Over $85 |
| Clean clogged aerator / minor drain | $35–$50 | $60 | Over $70 |
| Unclog bathtub drain | $45–$75 | $90 | Over $110 |
| Replace P-trap | $40–$65 | $75 | Over $85 |
| Replace washer shutoff valve | $65–$85 | $95 | Over $110 |
| Replace hose bib | $65–$95 | $110 | Over $125 |
| Replace 50-gal gas water heater (labor only) | $325–$375 | $425 | Over $475 |
| Replace 50-gal gas water heater with Rheem | $1,050–$1,250 | $1,350 | Over $1,450 |

### HVAC / Fans
| Repair | Typical | High but OK | Too High |
|---|---|---|---|
| Replace fan motor HVAC | $450–$550 | $600 | Over $650 |
| Replace dual run capacitor | $275–$325 | $350 | Over $375 |
| Program or repair ceiling fan receiver | $45–$65 | $75 | Over $85 |

### Irrigation / Exterior
| Repair | Typical | High but OK | Too High |
|---|---|---|---|
| Repair minor irrigation leak | $40–$65 | $75 | Over $85 |
| Replace irrigation valve | $175–$225 | $250 | Over $275 |
| Replace irrigation timer / Hunter controller | $200–$240 | $260 | Over $300 |
| Replace pressure vacuum breaker (3/4 in.) | $250–$300 | $325 | Over $350 |
| Palm tree trimming | $75–$150/palm | $175 | Over $200/palm |

### Toilets / Fixtures
| Repair | Typical | High but OK | Too High |
|---|---|---|---|
| Toilet fill valve | $45–$65 | $75 | Over $85 |
| Toilet flapper | $65–$75 | $85 | Over $95 |
| Toilet handle | $45–$60 | $70 | Over $80 |
| Replace toilet guts / flush assembly | $85–$105 | $120 | Over $135 |
| Replace entire toilet (labor only) | $75–$125 | $150 | Over $175 |
| Bathroom faucet install (labor only) | $55–$75 | $90 | Over $100 |
| Kitchen faucet install (labor only) | $100–$135 | $150 | Over $175 |
| Minor toilet running repair | $95–$125 | $140 | Over $150 |
| Garbage disposal install or replace | $100–$150 | $175 | Over $200 |

### Electrical
| Repair | Typical | High but OK | Too High |
|---|---|---|---|
| Replace GFCI outlet | $75–$100 | $115 | Over $125 |
| Replace breaker | $85–$125 | $150 | Over $175 |
| Install ceiling fan | $75–$125 | $150 | Over $175 |
| Replace standard light fixture | $65–$95 | $110 | Over $125 |
| Replace smoke detector (single) | $45–$55 | $65 | Over $75 |
| Replace smoke detectors (4+) | $35–$45 each | $50 each | Over $60 each |
| Replace light switch | $45–$60 | $70 | Over $80 |
| Replace electrical outlet | $45–$60 | $70 | Over $80 |
| Replace doorbell / thermostat | $75–$125 | $140 | Over $150 |

### Appliances
| Repair | Typical | High but OK | Too High |
|---|---|---|---|
| Install washer and dryer | $100–$150 | $175 | Over $200 |
| Replace Chamberlain garage door opener | $400–$500 | $550 | Over $600 |
| Install stove | $85–$105 | $125 | Over $140 |
| Install microwave | $75–$125 | $150 | Over $175 |
| Install dishwasher | $75–$125 | $150 | Over $175 |
| Garbage disposal replacement | $100–$150 | $175 | Over $200 |
| Refrigerator water line hookup | $65–$95 | $110 | Over $125 |
| Dryer vent cleaning | $75–$120 | $140 | Over $160 |

### Miscellaneous / Handyman
| Repair | Typical | High but OK | Too High |
|---|---|---|---|
| Install blinds | $15–$25/blind | $35 | Over $40 each |
| Adjust cabinet hinges | $35–$50 | $60 | Over $75 |
| Replace door knob | $45–$65 | $75 | Over $85 |
| Replace front door handleset | $85–$110 | $125 | Over $140 |
| Replace or repair window screen | $35–$50 | $60 | Over $70 |
| Patch small drywall hole | $75–$125 | $150 | Over $175 |
| Caulk tub or shower | $75–$95 | $110 | Over $125 |
| Rehang or adjust door | $65–$95 | $110 | Over $125 |
| Replace weather stripping | $45–$75 | $90 | Over $100 |
| Minor paint touch-up | $75–$150 | $175 | Over $200 |

### When a higher quote may still be reasonable
- After-hours, weekend, or emergency work
- Tenant-occupied property requiring multiple trips
- Property in a distant area outside Phoenix metro
- Specialty or higher-end materials
- Drywall, stucco, tile, or cabinetry work required
- Job requires a licensed trade instead of a handyman

---

## Vendor directory — who to assign by trade

Always check the property zone before selecting a vendor.
Always check Aptly/Rentvine for owner preferred vendor or home warranty first.
**Stuart Neely properties: ALWAYS use AC Rangers for HVAC — no exceptions.**

### General Maintenance
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Easy Clean | Ana & Jose |  | Maricopa | Confirm scope of work before assigning. 3-day service window for cleaning. Also primary cleaner in Maricopa. No: Roofing, Pool/Spa, Electrical (except basic outlet/breaker), Garage springs. |
| CrossRoads Remodeling AZ | Matthew | +17145830236 | Valley-wide | 2nd option for city of Maricopa if easy Clean can't do it. 2nd option to what Viatone can't do. |
| Hendershot Construction |  | +14803758969 | Valley-wide | Goes everywhere |

### Plumbing
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Viatone LLC |  |  | Valley-wide | Primary plumber valley-wide. Also 2nd option for Maricopa if Easy Clean is too busy. Use for ALL water heater's leaking regardless of city. |
| Easy Clean Maricopa |  | +17082892907 | Maricopa | If emergency on weekend or anytime and no one else, you can reach out to ask if they can take care of issue and how much outside of Maricopa. |
| CrossRoads Remodeling AZ |  | +17145830236 | Valley-wide | Great for faucets, garbage disposal, valves, toilet issues. |
| Hendershot Construction |  | +14803758969 | Valley-wide |  |
| JTB Plumbing LLC |  | +16024343641 | Valley-wide | Will match Viatone pricing, he is referral from Viatone and will go anywhere in valley. Does major plumbing too and licensed. |
| JB Water & Air |  |  | Valley-wide | Charges $250 extra for Maricopa — ask if they will waive if they do the work. Try to get approval beforehand. Only use if Easy Clean cannot handle in Maricopa. ⚠️ $250 extra for Maricopa — ask to waive. |

### Roofing
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Easy Clean | Ana & Jose |  | Maricopa | Unlicensed — minor work only (fallen tiles). Maricopa only. No: Major repairs, Licensed work. ⚠️ Unlicensed. |
| Superhero Roofing | Torsten |  | Valley-wide | Requires follow-up after assigning. licensed ⚠️ Follow up after assigning. |
| Legacy Roofing | Blake |  | Valley-wide | licensed |
| iRoof |  |  | Valley-wide | licensed |

### HVAC
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Mac's Heating & Cooling | Mike (owner), Amanda (bookkeeping) |  | Valley-wide | Primary HVAC vendor valley-wide. |
| AC Rangers |  |  | Valley-wide | ALWAYS use on Stuart Neely properties — he is a part owner. 2nd option in Maricopa ⚠️ ALWAYS use for Stuart Neely properties. |
| 911 Air |  |  | Valley-wide | Last resort only. |

### Garage Doors
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| 007 Garage |  |  | Valley-wide | Will NOT go to Maricopa or Casa Grande unless the job is worth it and preapproved— ask first before assigning. |
| CopaGrande |  |  | Maricopa, Casa Grande | Expensive. |
| Lifted High |  |  | Maricopa | Maricopa-based. More expensive. |
| Rottmann Garage Doors LLC |  | +16028816436 | East Valley |  |

### Landscaping
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Sunrise Landscaping |  |  | Maricopa | Maricopa only. |
| Sunset Saguaro's Landscaping LLC |  | +14809423725 | East Valley, Phoenix, Scottsdale, San Tan Valley, Queen Creek, Ahwatukee, Mesa, Tempe, Gilbert, Chandler |  |
| Rain or Shine Landscaping |  |  | Valley-wide | 2nd choice for Maricopa  Gets behind and work orders sometimes take time to close. Does a lot of our homes where landscaping is included |
| R&M Landscaping |  | +16027772492 | West Valley, Phoenix, Valley-wide |  |

### Carpet Services
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Castellanos CleanPro & Restoration LLC |  |  | Maricopa, Casa Grande |  |
| East Valley Carpet Cleaners |  |  | East Valley | East Valley areas: Chandler, Gilbert, Mesa, Tempe, Ahwatukee, Queen Creek, San Tan Valley. |
| Sean Floorsmith |  |  | Maricopa, Valley-wide | Also listed under Flooring. |
| Network Carpet |  | +14808449755 | Valley-wide |  |

### Flooring
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Sean Floorsmith |  |  | Valley-wide | Based out of Maricopa |
| Puckett's Flooring |  |  | Valley-wide | Accepts credit cards. |
| Juan's Painting & Repairs |  |  | Valley-wide | Primarily for vinyl plank. Also primary painter for Maricopa. |

### Painting
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Juan's Painting & Repairs |  |  | Maricopa | Primary painter for Maricopa. Only does Maricopa |
| Jacobo Gomez |  |  | Valley-wide | Goes all over the valley |
| Bigelow's Painting |  |  | Valley-wide | $1.30/sq ft. Communication is poor — be proactive with follow-up. Goes all over the valley ⚠️ Poor communication — follow up proactively. |
| JE Elite Cleaning |  | +16239864055 | Valley-wide | pain touch ups |
| Royalty Brush Painting |  | (480) 235-5904 | Valley-wide | Goes all over the valley |
| Platinum Exteriors |  | (928) 301-5529 | Valley-wide | $1.00/sq ft exterior. This is why they are priority, otherwise interior is last backup |
| CrossRoads Remodeling AZ |  | +17145830236 | Valley-wide | Does touch up painting for unit turns and drywall. Use primarily for touch ups and smaller jobs, quote on bigger. He is based in Maricopa, ask if he will charge more if job is further out like West Side or Central Phx. |

### Cleaning
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Easy Clean | Ana & Jose |  | Maricopa | 3-day service window. |
| JE Elite Cleaning |  |  | Valley-wide | Backup for Maricopa. Priority for all other locations. May need to send back — first cleaning not always sufficient. |

### Appliance Repair
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| J&G Appliance | Joe |  | Valley-wide | Also known as Joe Appliance. |
| Affordable Appliance Repair |  | +14809143381 | Valley-wide |  |
| Phoenix Appliance Works |  | +16028007468 | Valley-wide |  |
| The Appliance Repair Professionals |  | +18555128222 | Valley-wide |  |
| Jeff Appliance Repair |  | +15204311234 | Valley-wide | Casa Grande based |
| Felix Appliance repair |  | +14804868900 | Valley-wide |  |

### Pest Control
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| AZ Bug Guy |  |  | Maricopa, Casa Grande | Good for 1x sprays and included pest control plans. |
| T2 Pest Control |  |  | Valley-wide | Use everywhere, primary for termites, bees, rodents, gophers, one time spray, but 2nd choice in Maricopa for 1x spray. |
| Hunter Pest Control |  |  | Valley-wide | DO NOT use for one-time sprays. No: One-time sprays. |
| Budget Bro's Termite |  |  | Valley-wide |  |
| Green Machine Pest Control |  |  | Valley-wide |  |

### Glass Repair
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Lizard Heights |  |  | Valley-wide |  |
| Sommers Glass |  | +15208367763 | Valley-wide |  |
| Sonoran Glass |  | +16028990047 | Valley-wide |  |
| Universal Glass |  | +14808332928 | Valley-wide |  |

### Trash Removal
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Hendershot Construction |  | +14803758969 | Valley-wide |  |
| Arizona Trash Pirate |  | +15204507558 | Valley-wide |  |
| Rain or Shine Landscaping |  | +16026950948 | Valley-wide |  |
| Valet Verde |  | +14808233364 | Valley-wide |  |

### Septic Plumbing
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| A-Z Septic |  | +16025092017 | Valley-wide |  |
| Sunrise Plumbing Contractors, LLC |  | +16235216654 | Valley-wide |  |
| AAA Ajax Pumping |  | +16022780075 | Valley-wide |  |
| Ameripump |  | +14803190073 | Valley-wide |  |

### Carpet Cleaning
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Castellanos CleanPro & Restoration LLC |  | +15202807161 | Casa Grande, Maricopa |  |
| East Valley Floor Care |  | +14803401187 | East Valley, Scottsdale, Tempe, Mesa, San Tan Valley, Queen Creek, Ahwatukee, Gilbert, Chandler |  |
| Network Carpet |  | +14808449755 | Valley-wide, West Valley, Phoenix |  |

### Electrical
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Hendershot Construction |  | +14803758969 | Valley-wide |  |
| Easy Clean Maricopa |  | +17082892907 | Maricopa | Maricopa, unlicensed and will let you know if electrician is needed. |
| JM Electrical |  | +18188572645 | Valley-wide |  |
| Maricopa Electric |  | +14803104985 | Maricopa |  |
| Mr Electric |  | +14803767248 | Valley-wide |  |

### Drywall
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Juan's Painting and Repairs |  | +16233400898 | Maricopa |  |
| CrossRoads Remodeling AZ |  | +17145830236 | Valley-wide |  |
| Easy Clean Maricopa |  | +17082892907 | Maricopa |  |
| Jacobo Gomez |  | +16026892468 | Valley-wide |  |
| Bigelow's Painting & Remodeling LLC |  | +14803812944 | Valley-wide |  |

### Mold
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Advanced Environmental Solutions, LLC |  | +16026218594 | Valley-wide |  |

### Water Remediation
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Easy Clean Maricopa |  | +17082892907 | Maricopa | Call first for Maricopa to access |
| ALL-IN Ventures Inc. 1-800 WATER DAMAGE of Phoenix |  | +16027152225 | Valley-wide |  |
| Castellanos CleanPro & Restoration LLC |  | +15202807161 | East Valley |  |
| Nautilus Water and Mold Damage |  | +13032106999 | Valley-wide |  |

### Pool Service
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Maricopa Pool Marshall |  | +15202134393 | Maricopa |  |
| Vitality Pool Restoration Services |  | +16023973686 | East Valley |  |
| CoolTimes |  | +14807098891 | East Valley |  |

### Pool Remodel or Restoration
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Cool View Pools |  | +16024348774 | Valley-wide | Fixes pool surfaces, pool features, cracks, etc. |

### Fireplace and Chimney
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Honest Abe's Chimney Cleaning, LLC |  | +14806655335 | Valley-wide |  |

### HVAC Duct Cleaning
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Honest Abe's Chimney Cleaning, LLC |  | +14806655335 | Valley-wide |  |
| Castellanos CleanPro & Restoration LLC |  | +15202807161 | East Valley |  |

### Mailbox Keys
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| JK Postal |  | +16023329380 | Valley-wide |  |
| Express Mailbox |  | +14804404424 | Valley-wide |  |

### Locksmith
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| Parker Lock Solutions |  | +14805774849 | Valley-wide |  |
| JT's Keys and Locks |  | +16023691553 | Valley-wide |  |

### Home Warranty
| Vendor | Contact | Phone | Zone | Notes |
|---|---|---|---|---|
| 2-10 Home Warranty |  |  | Valley-wide |  |
| American Home Shield |  | +18886821043 | Valley-wide |  |
| American Home Warranty |  | +18886169901 | Valley-wide |  |
| Choice Home Warranty |  |  | Valley-wide |  |
| Fidelity Home Warranty |  |  | Valley-wide |  |
| First American Home Warranty |  | +18009923400 | Valley-wide |  |
| Geico Home Warranty |  | +18665358768 | Valley-wide |  |
| Home Warranty, Select |  |  | Valley-wide |  |
| Old Republic Home Warranty |  | +18009725985 | Valley-wide |  |
| One Guard Home Warranty |  |  | Valley-wide |  |
| Ortega Home Improvents |  | +16024197659 | Valley-wide |  |
| Platinum Home Warranty |  |  | Valley-wide |  |


## Key rules to always follow

- **Vendor calls tenant** — we never promise a time to the tenant
- **Stuart Neely properties** — always AC Rangers for HVAC (he is part owner)
- **Superhero Roofing** — always follow up after assigning, they need a nudge
- **Bigelow's Painting** — poor communication, be proactive with follow-up
- **JB Water & Air in Maricopa** — $250 extra charge, ask if they'll waive it
- **007 Garage in Maricopa/Casa Grande** — confirm they'll go before assigning
- **Hunter Pest Control** — never for one-time sprays
- **Easy Clean** — confirm scope before assigning, 3-day window for cleaning
- **Home warranty first** — always check before dispatching our own vendor
- **Appliance quotes** — if repair cost is more than 50% of replacement cost, recommend replacement to owner
- **Documentation** — every interaction goes in Rentvine notes. If it's not documented, it didn't happen.
