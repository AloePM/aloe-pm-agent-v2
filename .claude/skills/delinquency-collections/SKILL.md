---
name: delinquency-collections
description: "ALWAYS use this when rent is past due and Rex needs to work the delinquency — a resident is late, chronic, has an NSF, or is approaching pre-eviction. Reads the delinquency picture from Rentvine via Bo, classifies the case, applies a tiered outreach cadence from soft reminder up to formal notice, surfaces payment-plan options, and flags pre-eviction cases for Randi. Rex proposes every tenant message — never sends. All legal steps and payment plans are Randi's decision."
---

# Delinquency Collections — Aloe Property Management (Rex)

Rex uses this skill to work past-due rent methodically without making it worse legally or burning the resident relationship. Bo supplies the delinquency data from Rentvine. Rex drafts every message and escalation for Randi's approval — nothing goes to a resident unattended.

---

## Two Hard Rules

- **Propose-only.** Every reminder, notice, and message is drafted for Randi to approve before it goes out. Rex never sends a tenant communication on its own.
- **Legal steps are Randi's call.** Formal notices, payment plan agreements, and anything pre-eviction route to Randi with the full picture. Rex never serves a notice or initiates eviction.

---

## Habitability and Fair Housing Guards

- **Habitability.** If there is an open maintenance request or habitability issue on the property (no AC, water, unsafe conditions), do not push collections. Flag the case for Randi and stop. In Arizona nonpayment may be legally protected when habitability is at issue.
- **Fair housing.** Apply the same cadence to every resident in the same situation. Never vary tone, timing, or aggressiveness. Consistency is the protection.
- **Tone.** All drafts are factual and respectful. No threats, no shaming, no pressure language. A message that reads as harassment is a liability even when the debt is real.

When any of this is in doubt, stop and route to Randi immediately.

---

## Step 1 — Get the Delinquency Picture from Bo

Ask Bo to pull from Rentvine for the resident:
- Current balance breakdown: rent, late fees (GL 14), five-day notice fees (GL 57), other charges
- Days past due for the oldest unpaid amount
- Payment history: on-time rate, prior late counts, NSF/returned payments
- Any active payment plan and whether it is being kept
- Any open maintenance or habitability issue on the property
- Whether the five-day notice charge has already been posted this month (GL 57, auto-posted on the 5th)

---

## Step 2 — Classify the Case

| Band | Signs | Cadence |
|------|-------|---------|
| **Late** | First miss or a few days past due, otherwise good history | Soft reminder — usually all it takes |
| **Chronic** | Pattern of repeated lateness even if it usually gets paid | Firmer cadence, payment-plan conversation |
| **NSF** | Returned or bounced payment | More serious than lateness — NSF fee applies, short cure window |
| **Pre-eviction** | Large or long-standing balance, broken payment plan, or inside the notice timeline | Flag to Randi immediately — do not escalate further without her |

---

## Step 3 — Tiered Outreach Cadence

Escalate in order. Never skip a tier to rush to a notice.

### Tier 1 — Soft Reminder
A friendly, factual message: rent is past due, the amount owed, and how to pay in the Rentvine portal. For the Late band, this is often enough.

*Note: The five-day notice charge (GL 57) is auto-posted by Cloud Scheduler on the 5th — Rex does not need to manually trigger that charge.*

### Tier 2 — Firm Reminder
A clearer follow-up: restates the balance including late fees, notes the next step if it remains unpaid, and keeps the door open for a conversation.

### Tier 3 — Payment Plan Offer
For Chronic and NSF cases, offer a structured catch-up plan before anything formal:
- Arrears spread over defined installments on top of current rent
- Clear terms: amounts, due dates, what happens if a plan payment is missed
- Marked as a proposal — Randi approves before it is presented to the resident
- Once agreed, documented in writing in Rentvine

A kept payment plan usually beats a notice on both cost and relationship.

### Tier 4 — Formal Notice (Randi-gated)
Arizona law (A.R.S. § 33-1368) allows a 5-day pay-or-quit notice for nonpayment of rent. This is a legal step:
- Rex drafts the notice with the balance, the cure period, and the required language
- Randi reviews, approves, and arranges service — Rex never serves it
- The five-day notice charge (GL 57) should already be posted from the automation

### Tier 5 — Pre-Eviction Referral (Randi-gated)
If the 5-day notice period expires with no payment or resolution, produce a summary packet for Randi:
- Balance breakdown and full payment history
- Classification and cadence history (what was sent and when)
- Open habitability flags if any
- Specific decision needed from Randi

Rex stops here. Eviction is Randi's decision, not Rex's.

---

## Cases That Leave the Cadence Entirely

Flag to Randi immediately and stop the cadence for:
- Any pre-eviction case
- Any open habitability or maintenance issue on the property
- Any resident who has mentioned legal aid, a dispute, or a protected-status concern
- Any case where the resident has used words that trigger the escalation skill (lawyer, attorney, habitability, sue, lawsuit)

---

## Output for Each Delinquent Account

Rex produces:
- Balance breakdown and days past due (sourced from Bo / Rentvine)
- Classification: late / chronic / NSF / pre-eviction
- Recommended cadence tier and drafted next message (awaiting Randi's approval)
- Payment-plan option if applicable (terms, awaiting Randi's approval)
- Legal flag: none / formal-notice (Randi-gated) / pre-eviction referral
- Caution flags: open habitability issue, fair-housing concern, legal trigger words
- Two-sentence plain summary Randi can act on fast

---

## Validation

- Delinquency data came from Rentvine via Bo — not estimated.
- No message was sent to the resident without Randi's approval.
- No tier was skipped.
- No formal notice was served by Rex.
- No eviction was initiated by Rex.
- Habitability and fair housing guards were checked before any outreach.
- Every step is documented in Rentvine on the resident's lease page.
