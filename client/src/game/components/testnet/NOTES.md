# RUNE Testnet Prototype Notes

Question: which internal UI layout helps the team understand real RUNE balances, ledger trace, caps, and drift fastest before final UI integration?

Status: archived. The legacy route `/#/testnet/rune` now redirects to `/#/wallet`;
do not remount this prototype as a player-facing RUNE surface.

Data source: `/api/chain/rune/*` read-only endpoints backed by server chain state.

Variants:

- `A` - Audit Dashboard: global caps and invariant status first.
- `B` - Account First: account search and per-account trace first.
- `C` - Ledger Inspector: filters, table density, and JSON preview first.

Verdict: wallet is the canonical player-facing RUNE surface. Keep RUNE reads on
`/api/chain/rune/*` and `/api/chain/player/:username/rune`.
