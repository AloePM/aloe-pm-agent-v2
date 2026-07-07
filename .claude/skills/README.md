# Aloe PM Accounting Agent — Additions Package

Layer these files on top of the base `accounting-agent-template`. Bo takes over all operational bookkeeping and accounting oversight previously handled by human staff. Randi is the sole approver for money movement, ledger corrections, and external sends.

---

## What's already in the repo (`aloe-pm-agent-v2`)

These exist and do NOT need to be rebuilt — just make sure Bo's playbook loads them:

| Skill | What it does |
|-------|-------------|
| `accounting-settlement-alert` | Settlement classification, owner net payout calculation. Already in Bo's skill set. |
| `balance-inquiries` | Tenant balance explanations (Rex's skill, but applicable to Bo for owner/ledger questions) |

**Mae (`mae.js`) already owns:**
- Revenue snapshots (this month vs. last by GL category)
- Management fee income tracking (expected vs. collected at company level)
- Cash flow summaries (trust activity + Aloe's net income)

Bo does NOT duplicate Mae's reports. Bo verifies Rentvine postings; Mae reports company financials.

---

## What's new in this package

### New skills (copy to `.claude/skills/`)

| Skill | Replaces | What Bo does |
|-------|---------|-------------|
| `management-fee-reconciliation` | Juan's monthly fee verification | GL 93/94/14/40/148/57/58 check against active lease count — flags gaps, duplicates, suppressions |
| `suppressed-fees-review` | Juan's suppression tracking | Hub `/suppressed-fees` call, classifies documented / undocumented / stale |
| `expense-log-sync` | Juan's expense log management | Diffs Rentvine contact 3229 bills against Google Sheet — catches missing rows, orphans, amount mismatches |
| `five-day-notice-charges` | Juan's notice charge verification | Audits Cloud Scheduler GL 57 job on the 6th — missing, duplicate, zero-balance charges |
| `arizona-trust-compliance` | Persia's compliance oversight | ADRE three-way rec, 14-day deposit deadline tracking, commingling scan — flags to Randi |

### Updated skills (replace the template versions)

| Skill | What changed |
|-------|-------------|
| `ar-rent-posting` | Replaces AppFolio refs with Rentvine endpoints; adds GL context; folds in five-day notice cross-reference; all approvals route to Randi |

### New knowledge doc (ingest to KB)

| File | Action |
|------|--------|
| `aloe-gl-map.md` | `cortextos bus kb-ingest ./aloe-gl-map.md --org "$CTX_ORG" --scope private` |

### Updated config files (replace template versions)

| File | What changed |
|------|-------------|
| `SYSTEM.md` | Actual Aloe stack; complete GL map; Juan and Persia replaced — Bo owns all operational accounting duties; Randi is the sole approver |

---

## How to apply

```bash
# Copy new skills
cp -r aloe-accounting-additions/.claude/skills/management-fee-reconciliation  your-agent/.claude/skills/
cp -r aloe-accounting-additions/.claude/skills/suppressed-fees-review          your-agent/.claude/skills/
cp -r aloe-accounting-additions/.claude/skills/arizona-trust-compliance        your-agent/.claude/skills/
cp -r aloe-accounting-additions/.claude/skills/expense-log-sync               your-agent/.claude/skills/
cp -r aloe-accounting-additions/.claude/skills/five-day-notice-charges        your-agent/.claude/skills/

# Override template files
cp aloe-accounting-additions/SYSTEM.md                                         your-agent/SYSTEM.md
cp aloe-accounting-additions/.claude/skills/ar-rent-posting/SKILL.md          your-agent/.claude/skills/ar-rent-posting/SKILL.md

# Ingest GL map
cp aloe-accounting-additions/aloe-gl-map.md your-agent/
cortextos bus kb-ingest ./aloe-gl-map.md --org "$CTX_ORG" --scope private
```

---

## Crons to add after onboarding

```bash
# Management fee reconciliation — 1st of month, 8 AM Phoenix
cortextos bus add-cron "$CTX_AGENT_NAME" mgmt-fee-rec "0 8 1 * *" \
  "Run management-fee-reconciliation for the prior month: verify GL 93/94/14/40/148/57 postings against active lease count. Run suppressed-fees-review. Surface gaps and flag any corrections to Randi."

# Expense log sync — Mondays, 9 AM Phoenix
cortextos bus add-cron "$CTX_AGENT_NAME" expense-log-sync "0 9 * * 1" \
  "Run expense-log-sync: diff Rentvine payables (contact 3229) against the Expense Log Google Sheet. Surface missing rows and discrepancies. Present for Randi's approval before writing."

# Five-day notice audit — 6th of month, 10 AM Phoenix (day after automation)
cortextos bus add-cron "$CTX_AGENT_NAME" notice-charge-audit "0 10 6 * *" \
  "Run five-day-notice-charges: verify the 5th-of-month Cloud Scheduler job posted GL 57 correctly. Flag missing, duplicate, or erroneous charges. Route corrections to Randi."

# AZ trust compliance — 5th of month, 8 AM Phoenix
cortextos bus add-cron "$CTX_AGENT_NAME" az-trust-compliance "0 8 5 * *" \
  "Run arizona-trust-compliance alongside trust-reconciliation: ADRE three-way rec, deposit deadlines, commingling scan. Any critical flag goes to Randi immediately."
```

---

## Onboarding answers (Aloe-specific)

When the template's onboarding script asks:

**Step 2 — Accounting platform:**
- System: Rentvine (property management) + QuickBooks Online (company books via Mae)
- Bank feed: Manual export — human-supplied input

**Step 3 — Trust account:**
- Yes — Arizona ADRE rules, one combined trust account, monthly three-way rec

**Step 5 — Approval thresholds:**
- All money movement: always-ask, route to Randi

**Staff references in skill placeholders:**
- `{{operator_name}}` = Randi
- `{{owner_name}}` = Randi
- `{{maintenance_agent_name}}` = Ari
- `{{leasing_agent_name}}` = Ivy

---

## What the base template already covers (no changes needed)

- `ap-vendor-payments` — works as-is; `{{maintenance_agent_name}}` (Ari) fills at onboarding
- `owner-statement-drafting` — works as-is; Randi approves all sends
- `owner-draws` — works as-is; Randi approves all disbursements
- `trust-reconciliation` — works as-is; AZ skill overlays on top
- `trust-compliance` — works as-is; AZ skill adds the jurisdiction layer
- `security-deposit-accounting` — works as-is; AZ deadlines covered by `arizona-trust-compliance`
