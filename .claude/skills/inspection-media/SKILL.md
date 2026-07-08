**Narration matters.** Inspectors often speak the most important observations
out loud while recording. The pipeline transcribes the audio and
cross-references it with the frame analysis — so a spoken "patio latch sticks"
is captured even if the frame doesn't show it clearly.

---

## Findings Schema

Each finding includes:
- `category` — Paint, Flooring, Walls & baseboards, Ceiling, Fixtures,
  Appliances, Plumbing, HVAC, Cleanliness, Safety, Cabinets, Exterior, etc.
- `room` — which room or area
- `severity` — `good` / `fair` / `poor` / `critical`
- `findings` — what is observed
- `action_needed` — what to do
- `estimated_scope` — Touch-up / Partial / Full replacement
- `vendor_type` — Painter, Handyman, Carpet Cleaner, Plumber, etc.

Plus at the report level:
- `overall_condition_score` — 1–10
- `urgent_items` — anything needing immediate action
- `vendor_summary` — one line per vendor type with scope and priority
- `turnover_estimate` — Light / Standard / Heavy / Full renovation
- `chargeback_items` — tenant damage vs. normal wear candidates

---

## Ari's Workflow

1. Staff drops video or photos in `#ari-maintenance` with context
   (e.g. "move-out walkthrough — 123 Main St").
2. Ari sends the media to the Hub `/inspection-media` endpoint.
3. Hub runs the pipeline and returns structured findings JSON.
4. Ari posts the markdown report in the thread.
5. For each `vendor_summary` line → Ari creates a work order.
6. For each `chargeback_items` entry → Ari flags for Randi's review
   before any deposit deduction is made.

---

## Hard Gate

- **Chargeback decisions are Randi's call.** Ari flags candidates; it
  never deducts from a deposit without Randi's approval.
- **Media is sensitive.** Inspection frames, audio, and transcripts
  contain unit interiors and tenant belongings. Treated as PII —
  kept in a scoped workspace, deleted after the report is generated,
  never committed to the repo.
- **Schema validation before action.** Ari only acts on findings that
  pass validation. If the pipeline returns invalid JSON, Ari posts
  the raw report and asks staff to review manually.

---

## Privacy & Safety

- Inspection media is PII-heavy: unit interiors, personal belongings,
  addresses. Handle accordingly.
- No frames, audio, or transcripts are stored permanently.
- All keys come from environment variables — no hardcoded secrets.

---

## Status

The SKILL.md is live. The Hub endpoint (`/inspection-media`) is
**not yet deployed** — this skill will be fully active once that
endpoint is built. In the meantime, Ari can reference this skill
to explain the capability and collect media for when the pipeline
is ready.
