---
name: make-ready-scheduling
description: "ALWAYS use this when a unit needs to be turned and made rent-ready by a target date at Aloe Property Management. Takes the move-out inspection findings (from inspection-media or a manual scope), sequences the trades in dependency order, sets a window for each task, finds the critical path, flags slippage risk, and produces a dispatch-ready timeline for vendor-coordination. Ari plans only — vendor booking and dispatch go through vendor-coordination."
---

# Make-Ready Scheduling — Aloe Property Management (Ari)

Ari uses this skill when a unit turns over and needs to be rent-ready by a target date. It sequences the trades, finds the critical path, and flags risk early. It plans only — vendor dispatch goes through the vendor-coordination skill.

---

## Inputs Needed Before Building the Plan

- **Target rent-ready date** — when the unit must be ready to show or move in
- **Scope of work** — from the move-out inspection findings (inspection-media output) or a manual scope list
- **Available start date** — when the unit is vacant and accessible
- **Known constraints** — vendor availability, material lead times, cure/dry times

If the target date or scope is missing, ask before building the plan.

---

## Scope Source

The primary scope source is the **inspection-media pipeline** (`/inspection-media` on the Hub). The findings JSON includes per-category severity, action needed, vendor type, and a turnover estimate (Light / Standard / Heavy / Full renovation). Feed that output directly into this skill to build the task list.

If inspection-media was not run, pull the scope from the move-out inspection report in Rentvine or zInspector.

---

## Standard Make-Ready Sequence (Aloe)

Order tasks by what must finish before the next can start:

1. **Trash-out / haul-away** — clear the unit so every trade has room
2. **Demo / removal** — pull anything being replaced (old flooring, fixtures, appliances)
3. **Repairs and rough work** — drywall, plumbing, electrical, anything structural
4. **HVAC service** — critical in Phoenix heat; confirm cooling is working before paint or flooring goes in. Flag as a critical path item year-round.
5. **Paint** — after repairs, before new flooring
6. **Flooring** — after paint and after all wet/rough work
7. **Fixtures / appliances / finish work** — install once surfaces are done
8. **Deep clean** — after all dusty trades
9. **Final make-ready inspection** — last step; confirms unit is genuinely rent-ready

Dry and cure times (paint cure, caulk set, floor adhesive) are their own calendar blocks — they take time even with no one on site.

---

## Authorization Threshold

The default vendor authorization limit is **$350** per work order unless the Aptly work order specifies a different amount. Any single task estimated over $350 must be flagged for owner approval before dispatch. Ari does not authorize work over the threshold without owner sign-off.

Emergency exception: dispatch first for life-safety issues, notify owner simultaneously.

---

## Building the Schedule

1. List every task from the scope with its duration and dependencies.
2. Order by dependency using the sequence above; adjust to the actual spec.
3. Tasks with no shared dependency can run in parallel if different trades and different rooms allow it.
4. Assign a window to each task: earliest start → expected finish.
5. Build in dry/cure blocks and vendor day-of-week constraints.
6. Find the critical path — the longest dependent chain from start to finish. Tasks on the critical path have zero slack.
7. Compare finish date to target:
   - **On track** — finishes on or before target; note the slack
   - **At risk** — finishes after target; show the gap, the driving tasks, and what could compress it (safe overlaps, expedite a material, add a crew)
8. Flag slippage risks: long lead times, unconfirmed vendors, cure time landing on a weekend, HVAC parts on order, single trade with no backup.

---

## Phoenix-Specific Flags

- **HVAC** — in Phoenix heat, a unit without working AC is not showable. HVAC service is always on the critical path from May through October. Flag immediately if HVAC is in the scope.
- **Exterior paint / stucco** — curing is affected by extreme heat; check manufacturer specs in summer months.
- **Flooring adhesive** — high temperatures can affect cure times; coordinate with flooring vendor.

---

## Output

- Task list: task | duration | depends-on | trade | estimated cost
- Ordered timeline: each task with start and finish window
- Critical path: the driving chain and earliest possible ready date
- Target comparison: on-track (with slack) or at-risk (with gap and driver)
- Slippage risks: lead times, unconfirmed vendors, HVAC flags, tight cure windows
- Authorization flags: any task estimated over $350 needing owner approval
- Dispatch handoff list: tasks ready to pass to vendor-coordination with vendor type, window, and scope
- Turnover estimate tier from inspection-media: Light / Standard / Heavy / Full renovation

---

## What It Plugs Into

- **inspection-media** — provides the scope (findings JSON → task list and vendor types)
- **vendor-coordination** — receives the dispatch handoff list; owns vendor selection, booking, and close-out
- **turnover-coordination** — the broader turn workflow this feeds
- **Aptly work orders** — one work order per vendor line in the dispatch handoff list

---

## Validation

- Scope came from inspection-media or a verified move-out inspection — not estimated.
- Tasks are in dependency order; no trade was scheduled before its dependency is done.
- HVAC was checked and flagged if in scope.
- Any task over $350 is flagged for owner approval before dispatch.
- No vendor was booked or contacted by this skill — dispatch goes to vendor-coordination.
