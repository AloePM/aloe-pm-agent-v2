 ---
name: suppressed-fees-review
description: "Surface properties where management fees (GL 93) have been manually suppressed in Rentvine. Run monthly before owner statements are drafted, or on demand. Classifies suppressions as documented, undocumented, or stale. Flags undocumented and stale items for Randi. Verify-and-flag only — no fee changes without Randi's approval."
---

# Suppressed Fees Review

Bo uses this skill to surface properties where management fees are suppressed so suppressions are intentional and visible rather than invisible revenue leakage.

A suppressed management fee is not automatically an error — Aloe sometimes waives fees for new owners, owner incentives, or special arrangements. But every suppression should have a documented reason, and the aggregate revenue impact should be visible at month-end.

---

## Hard Gate

Re-enabling or adjusting a suppressed fee requires Randi's approval.

---

## Data Source

### Option 1 — Internal Hub endpoint (preferred)
Call the Internal Hub `/suppressed-fees` endpoint to get the current suppressed fee list with property and amount.

### Option 2 — Rentvine API fallback
If the hub endpoint is unavailable:
1. Pull active lease export (`GET /leases/export?primaryLeaseStatusIDs[]=2`)
2. Pull GL 93 postings for the current period (bills filtered to contactIDs `[1, 3380]`)
3. Join: active properties without a matching GL 93 posting = suppression candidates

---

## Workflow

1. Pull the suppressed fee list from the hub or compute via Rentvine.
2. For each suppressed property, note:
   - Property address
   - Owner name
   - Monthly fee impact ($89/mo standard)
   - Months suppressed if derivable
   - Any documented reason in Rentvine notes or Aptly
3. Compute total monthly revenue impact = count × $89.
4. Classify each suppression:
   - `documented` — reason is on record
   - `undocumented` — no reason found; flag for Randi
   - `stale` — suppression older than 90 days with no review note; flag for Randi
5. Surface the full list; flag `undocumented` and `stale` items for Randi's decision.

---

## Output Contract

Return a markdown table with:
- Count of properties with suppressed management fees
- Total monthly revenue impact
- Per-property row: address, owner, status, reason if available
- Summary of undocumented and stale suppressions requiring Randi's review
- Any reinstatement recommendations marked `APPROVAL REQUIRED — route to Randi`

---

## Validation

- Source and timestamp of suppression data is cited.
- No fee was re-enabled without Randi's approval.
- Revenue impact calculation is shown and tied to source count.
