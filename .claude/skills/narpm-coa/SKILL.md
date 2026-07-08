---
name: narpm-coa
effort: medium
description: "Map a property manager's CURRENT chart of accounts onto the NARPM® Trust Chart of Accounts standard, and produce their migration plan: which existing accounts to rename and renumber, which new accounts to add, which to consolidate, and which to archive. Use when an operator wants to adopt (or audit against) the NARPM Trust COA, when onboarding a new accounting client whose books are non-standard, or when their GL is a tangle of overlapping fee and expense accounts. Pure know-how: the agent reads the operator's GL export and writes their mapping; no scripts required."
triggers: ["narpm coa", "narpm chart of accounts", "narpm trust coa", "chart of accounts", "coa migration", "gl account mapping", "standardize chart of accounts", "trust accounting coa", "renumber gl accounts", "appfolio gl accounts", "account mapping", "map my chart of accounts", "trust coa standard"]
---

# NARPM® Trust Chart of Accounts mapping

## Aloe PM — Pre-Mapped GL Accounts

Aloe uses Rentvine (not AppFolio). The system default settings live in Rentvine's accounting configuration. Aloe's confirmed GL accounts and their NARPM equivalents:

| Aloe GL | Account Name | NARPM # | NARPM Account |
|---------|-------------|---------|--------------|
| 14 | Late Fees | 4020 | Late Fee Income |
| 40 | RBP (Resident Benefit Package) | 4006 | RBP Income |
| 43 | Renewal Fees | 5005 / 4008 | Lease Renewal Fee / Tenant Renewal Fee |
| 51 | Pet Fees | 4041 | Non-Refundable Initial Pet Fee |
| 56 | Transaction Fees | 4091 | Tenant Administration Fee |
| 57 | Five Day Notice Fees | 4091 | Tenant Administration Fee (subaccount) |
| 58 | Admin / Inspection Fees | 4091 | Tenant Administration Fee |
| 62 | Lease Break Fees | 4050 | Lease Break / Liquidated Damages |
| 82 | Cleaning | 5230 | Turnover - Cleaning & Maid |
| 93 | Management Fees | 5000 | Management Fee Expense |
| 94 | Placement / Onboarding Fees | 5010 | Leasing Commission Expense |
| 148 | SN-Resident Benefit Package | 4006 | RBP Income (variant) |

**Owner deduction exclusion list** (Aloe fee accounts — never deduct from owner net):
`93, 94, 40, 148, 58, 14, 51, 90, 136, 57, 12, 62, 56, 145, 19`

**Rentvine note:** After any COA migration, re-point ALL Rentvine system defaults in accounting configuration. One missed default silently misroutes real money on the next posting.

**Verify before committing:** This mapping is based on Aloe's confirmed GL accounts as of mid-2026. Verify against the current NARPM standard at pmtrustcoa.com before executing any changes. All COA changes require Randi's approval.

---
