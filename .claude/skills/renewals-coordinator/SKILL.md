---
name: renewals-coordinator
description: "ALWAYS use this when a tenant's lease is approaching expiration, a card appears on the Aptly Tenant Renewals board, or Rex needs to score renewal risk, recommend a path, or prep a renewal offer. Covers renewal-window detection, risk scoring from Rentvine payment history, rent proposal, the $150 tenant renewal fee, and offer packet drafting. Proposes only — never sends a resident or owner anything without Randi's approval."
---

# Renewals Coordinator — Aloe Property Management (Rex)

Rex uses this skill to manage the renewal lifecycle from the Aptly Tenant Renewals board. Rex scores the renewal, recommends a path, proposes rent, and preps an offer packet. Rex never sends a renewal offer or any resident- or owner-facing message without Randi's approval.

---

## Hard Gate

Sending a renewal offer, or any resident- or owner-facing renewal message, is approval-gated. Rex drafts the offer packet and recommendation; Randi approves and sends. Rex never sends a resident or owner anything.

Before any resident-facing draft is surfaced, run it through the fair-housing-guard skill.

---

## Pipeline — Aptly Tenant Renewals Board

The Tenant Renewals board in Aptly is the system of record for the renewal pipeline. Each card represents a lease approaching expiration. Rex monitors the board and works each card through the renewal workflow.

Track and log every step in the card comments.

---

## Inputs

- Aptly Tenant Renewals board card (lease end date, unit, resident name)
- Rentvine lease record: current rent, lease term, start/end dates
- Rentvine payment history: on-time rate, late payments, NSFs, bounced payments, balance owed
- Current market comps if available
- Property rent-increase ceiling if set by owner

---

## Fees

| Fee | Amount | Who Pays | When |
|-----|--------|----------|------|
| Tenant renewal fee | $150 | Tenant | On lease renewal |
| Owner renewal fee | $99/yr (GL 43) | Owner | Billed to owner at renewal |

---

## Workflow

### 1. Confirm the renewal window
Lease end date must be within the active renewal window (typically 60–90 days out). If not in the window yet, note the date and check back. Do not start the renewal process early without reason.

### 2. Score renewal risk from Rentvine payment history
Pull the resident's payment record from Rentvine. Score as low / medium / high with the top reasons:
- **Low:** consistent on-time payments, no NSFs, no balance owed
- **Medium:** 1–2 late payments, minor issues, currently current
- **High:** repeated late payments, NSFs, bounced payments, balance owed, prior lease violations

### 3. Recommend a path
Based on risk score and lease history, recommend one of:
- **Renew** — offer a new lease term with proposed rent
- **Month-to-month** — offer MTM while monitoring; flag for owner awareness
- **Non-renew** — recommend non-renewal; flag for Randi and owner decision

Non-renewal decisions always route to Randi. Rex never initiates a non-renewal communication unattended.

### 4. Propose rent
- Check current rent against market comps if available.
- Never propose a rent cut off a missing or implausible market value — propose holding flat and explain why.
- Clamp any increase to the property ceiling if one is set.
- Include the $150 tenant renewal fee in the offer terms.
- Include the $99/yr owner renewal fee (GL 43) — this is billed to the owner, not the tenant.

### 5. Flag anything worth knowing
- Balance owed at renewal time
- Prior NSF or bounced payment
- Active lease violations
- Pet or other addendum that carries forward
- HOA registration status if applicable

### 6. Prep the offer packet
Compile: proposed rent, lease term, renewal fee ($150 tenant), risk band, market-check result, flags, and a draft resident-facing renewal offer.

Run the resident-facing draft through the fair-housing-guard skill before surfacing it.

### 7. Route for approval
Present the full packet to Randi for approval. Do not send anything to the resident or owner until approved.

---

## Arizona Notice Requirements

Arizona requires reasonable advance notice for renewal offers. Standard practice is 60 days before lease end. Never let a lease expire without a documented renewal decision on the Aptly card.

---

## Output Contract

Return:
- Resident / unit / property reference and Aptly card link
- Renewal window confirmation (days until lease end)
- Risk band (low / medium / high) with top reasons from Rentvine payment history
- Recommended path (renew / month-to-month / non-renew) with rationale
- Proposed rent with market-check result and ceiling-clamp note if applicable
- Tenant renewal fee: $150
- Owner renewal fee: $99/yr (GL 43)
- Flags: balance owed, NSFs, violations, pet addendum, HOA status
- Resident-facing offer draft (fair-housing-guard cleared)
- Approval request marked `APPROVAL REQUIRED — route to Randi`

---

## Validation

- Lease was confirmed in the renewal window before any proposal.
- Risk was scored from the real Rentvine payment record, not estimated.
- No rent cut was proposed off a missing or implausible market value.
- Any increase is clamped to the property ceiling if set.
- $150 tenant renewal fee is included in the offer terms.
- fair-housing-guard was run on the resident-facing draft.
- Nothing was sent to the resident or owner without Randi's approval.
- Every step is logged in the Aptly Tenant Renewals card.
