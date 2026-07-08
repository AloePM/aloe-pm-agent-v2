Any variance must be flagged to Randi immediately. Never auto-correct a trust
ledger discrepancy.

---

## Privacy & Safety

- Bank transaction data is financial PII. Keep it scoped to the reconciliation
  run — not stored, not committed to the repo.
- All Plaid credentials come from environment variables.
- `--demo` mode reconciles a fictional sample with zero Plaid calls — use this
  to test the pipeline before connecting live accounts.

---

## Output Contract

Bo returns a reconciliation report with:
- Period and account reconciled
- Matched count and total
- `clean: true / false`
- Amount mismatches: ledger amount vs. bank amount, difference
- Bank-only transactions: date, amount, description
- Ledger-only entries: date, amount, description
- Duplicates: which side, how many
- Summary discrepancy total
- All corrections marked `APPROVAL REQUIRED — route to Randi`

---

## Status

SKILL.md is live. The Hub `/bank-recon` endpoint is **not yet deployed** —
fully active once that endpoint is built. Bo can reference this skill and
collect reconciliation requests in the meantime.
