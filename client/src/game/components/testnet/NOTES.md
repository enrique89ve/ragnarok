# RUNE Testnet Prototype Notes

Question: which internal UI layout helps the team understand real RUNE balances, ledger trace, caps, and drift fastest before final UI integration?

Route: `/#/testnet/rune?variant=A`

Data source: `/api/chain/rune/*` read-only endpoints backed by server chain state.

Variants:

- `A` - Audit Dashboard: global caps and invariant status first.
- `B` - Account First: account search and per-account trace first.
- `C` - Ledger Inspector: filters, table density, and JSON preview first.

Verdict: pending team review. Delete losing variants and fold the chosen layout into the real testnet panel.
