# CLAUDE.md — Aloe Property Management

Guidance for working with documents in this folder. Read this before creating,
naming, editing, or filing any document.

## About the business

Aloe Property Management runs a **mixed portfolio** — both residential
(single- and multi-family) and commercial properties. Documents here serve
three audiences:

- **Property owners** — updates, performance, and reports on their properties.
- **Tenants** — leases and communications.
- **Vendors / contractors** — work orders and service coordination.

Always know which audience a document is for; it changes the tone, the level of
detail, and what information is safe to include.

## Folder structure

```
Inspection Reports/   └── Archive/
Owner Updates/        └── Archive/
Work Orders/          └── Archive/
Leases/               └── Archive/
```

Keep documents in the correct top-level folder. Each folder has an `Archive`
subfolder for retired documents (see Archiving).

## File naming

Use **property-first** naming so all documents for a property group together:

```
PropertyName_DocType_YYYY-MM-DD
```

Examples:
- `MapleSt-204_Lease_2026-06-17.pdf`
- `OakwoodPlaza_InspectionReport_2026-06-17.pdf`
- `MapleSt-204_OwnerUpdate_2026-06.docx`

Use a consistent short property identifier (e.g. `MapleSt-204`). Use ISO dates
(`YYYY-MM-DD`) so files sort chronologically within a property.

## Work orders

> **Triage:** To classify a work order's urgency, use the **work-order-triage**
> skill (`.claude/skills/work-order-triage/SKILL.md`). It defines the
> Emergency / Urgent / Routine tiers, SLAs, escalation exceptions, and dispatch
> rules. Don't assign a priority by guesswork — use the skill.
>
> **Follow-up:** Once a work order is scheduled (vendor + date), use the
> **work-order-followup** skill (`.claude/skills/work-order-followup/SKILL.md`)
> to confirm, send the morning-of reminder, and verify completion. Don't draft
> tenant/vendor follow-up messages by guesswork — use the skill.
>
> **Cost authorization:** Default approval threshold is **$350** — if a vendor's
> price comes back over that, get owner approval before authorizing the work.
> **But the maintenance amount on the work order in our software takes
> precedence** and varies by WO; when a WO specifies its own amount, use that
> instead of $350. See the **work-order-triage** skill for the full rule.

- **One file per work order.**
- **Track status in the filename** so the queue is visible at a glance. Use:
  `Open`, `In-Progress`, `Closed`.
  - e.g. `MapleSt-204_WorkOrder_Plumbing_Open_2026-06-17.docx`
  - Update the status word in the filename as the job progresses.
- Work orders need **fast turnaround** — flag anything urgent or safety-related
  and don't let `Open` items sit.

## HOA registration

> Properties in an HOA require each tenant to be **registered with the HOA**.
> This is owned by the **dedicated registration admin / office** (not the
> Maintenance or Leasing Coordinator). Use the **hoa-registration** skill to
> register a tenant (find requirements → submit form+lease → book the ~$25 fee →
> save the HOA confirmation as proof), and **hoa-registration-audit** to
> reconcile who is/ isn't registered (`HOA_Registration_Audit_v2.xlsx`). See
> `.claude/workflows/hoa-workflow.md`. Fee booking: reimbursement /
> "HOA dues" account / owner expense — never the tenant ledger.

## Archiving

Move documents to the relevant `Archive/` subfolder **when the relationship
ends** — i.e. when a lease terminates or an owner leaves the portfolio. Move the
property's documents together. Active relationships stay in the main folders.

## Document formats

Work primarily in **Word/Docs**, **spreadsheets**, and **PDF**:
- **Drafts and letters** → Word/Docs (editable).
- **Trackers and logs** → spreadsheets.
- **Final, signed, or distributed documents** (leases, inspection reports,
  owner updates sent out) → PDF.

## Tone & communication

Owner updates and tenant communications should be **warm and professional** —
friendly and relationship-focused, but polished. Lead with the point, be
respectful, and keep it clear.

## What matters most

Apply these priorities to every document:

1. **Tenant privacy** — protect personal and financial information. Don't expose
   tenant details to owners or vendors beyond what they need. Be cautious about
   sharing.
2. **Lease & legal accuracy** — dates, terms, rent amounts, and obligations must
   be exact. Double-check anything legal; flag uncertainty rather than guessing.
3. **Fast turnaround** — especially on work orders and tenant responses.
4. **Consistent records** — document every property the same way, every time, so
   the portfolio is uniform and auditable.

## Quick rules of thumb

- Right folder, property-first name, ISO date — every time.
- Sensitive tenant info stays out of owner- and vendor-facing documents.
- Get legal/lease details exact, or flag them.
- Archive only when the lease ends or the owner exits.
