---
name: turnover-coordination
description: "ALWAYS use this when a tenant has moved out and the unit needs to be turned and made rent-ready at Aloe Property Management. Takes the move-out inspection findings from inspection-media, builds a make-ready punch list, separates normal wear from tenant-caused damage, sequences the trades, tracks the unit to rent-ready, and hands off to Ivy for leasing. Re-key on every turn is non-negotiable. Ari coordinates the turn — vendor dispatch goes through vendor-coordination, deposit chargeback feed goes to Bo."
---

# Turnover Coordination — Aloe Property Management (Ari)

Ari uses this skill to run the whole unit turn from move-out to rent-ready. Vacancy costs money every day — the job is to get the unit cleaned, fixed, and showable fast without skipping the steps that protect the deposit accounting or the next resident's first impression.

Ari plans and tracks. Inspection-media captures the walk-through. Vendor-coordination dispatches the trades. Bo handles the deposit chargeback accounting. Ivy picks up the unit when it hits rent-ready.

---

## Step 1 — Move-Out Inspection to Scope

Start from the inspection-media pipeline, not from memory. Run the move-out walk-through through the Hub `/inspection-media` endpoint first. The findings JSON gives room-by-room conditions with severity, vendor type, and chargeback candidates.

From the findings, build the scope:

1. List every condition issue room by room, each tied to its photo evidence from the inspection.
2. Classify each item as **normal wear** (owner cost) or **tenant-caused damage** (possible chargeback). When genuinely unclear, flag for Randi — never guess in either direction.
3. Mark any safety or habitability issue (no smoke detector, exposed wiring, no working lock, no AC in Phoenix heat) as **must-fix** — not optional.

The wear-vs-damage classification feeds Bo's `security-deposit-accounting` skill for deposit disposition. Keep that accounting separate from the rent-ready gate but capture it immediately — Arizona's 14-business-day deadline (A.R.S. § 33-1321) starts at move-out and possession delivery.

---

## Step 2 — Build the Make-Ready Punch List

Turn the scope into an ordered punch list. Standard Aloe turn buckets:

| Bucket | What's in it |
|--------|-------------|
| **Repairs** | Drywall, fixtures, appliances, plumbing, electrical — before paint |
| **HVAC** | Service and confirm cooling works — critical in Phoenix; must-fix May–October |
| **Paint** | Touch-up or full repaint after repairs are done |
| **Flooring** | Clean, repair, or replace after paint |
| **Clean** | Full make-ready clean after all dusty trades are done |
| **Keys / Re-key** | Re-key all exterior locks, collect mailbox and amenity keys, reset codes — **non-negotiable on every turn** |

Each punch-list item carries: trade needed, wear vs. damage, estimated cost, priority, and dependency.

**Authorization threshold:** Any single job estimated over **$350** must be flagged for owner approval before dispatch (unless the Aptly work order specifies a higher amount).

---

## Step 3 — Sequence the Trades

Hand the punch list to the `make-ready-scheduling` skill to sequence. The standard order:

1. Repairs and demo first
2. HVAC service (confirm cooling before paint or flooring)
3. Paint after repairs are done and dry
4. Flooring after paint
5. Make-ready clean after all dusty trades
6. Re-key last, right before the unit is marked rent-ready

Jobs with no shared dependency can run in parallel if different trades and different rooms allow it. Hand each job to `vendor-coordination` with its window and dependency noted.

---

## Step 4 — Track to Rent-Ready

Run the unit as a live checklist in Aptly:

- Track each punch-list item: not-started / scheduled / in-progress / done
- Surface slippage early — show what is blocking and how many days to the target
- **Rent-ready gate:** unit flips to rent-ready only when every must-fix and standard make-ready item is done and verified with photo evidence, including the re-key
- Verify completion against actual condition, not "the vendor said it's done"

---

## Step 5 — Hand Off to Ivy and Bo

**Ivy (leasing handoff):**
- Ready date confirmed
- Showable photos from final walk-through
- Keys and access codes ready
- Any notes the leasing side needs (warranty on new appliance, deferred cosmetic item owner declined)

**Bo (deposit disposition feed):**
- Wear-vs-damage classification list with photo references
- Chargeback candidates flagged by inspection-media
- Bo runs `security-deposit-accounting` with this list and the Arizona 14-business-day deadline

---

## Re-Key Rule

Re-key or re-core all exterior locks on every turn. No exceptions. A prior tenant's key floating around is a liability. This step is not optional even if the owner pushes back on cost.

---

## Output Shape

- Condition scope: per-item, wear vs. damage, severity, photo reference
- Make-ready punch list: repair / HVAC / paint / floor / clean / keys — each with trade, cost bucket, priority, dependency
- Trade sequence: ordered plan from make-ready-scheduling with parallel-safe items noted
- Status board: each item not-started / scheduled / in-progress / done (tracked in Aptly)
- Authorization flags: any job over $350 needing owner approval
- Rent-ready gate: green only when all must-fix + standard items verified + re-keyed
- Leasing handoff packet: ready date, showable photos, key/access status, notes for Ivy
- Deposit disposition feed: wear-vs-damage list for Bo's security-deposit-accounting

---

## Validation

- Scope came from inspection-media, not from memory.
- Every must-fix item is completed and verified before rent-ready is declared.
- Re-key is confirmed complete — not assumed.
- Wear-vs-damage classification was sent to Bo before the Arizona 14-day deadline.
- No trade was dispatched without going through vendor-coordination.
- No job over $350 was authorized without owner approval.
- Ivy received the leasing handoff packet when rent-ready was confirmed.
