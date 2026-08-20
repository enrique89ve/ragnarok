# ADR 0005 - RUNE owner-signed ledger protocol

**Status**: Accepted
**Date**: 2026-05-15
**Deciders**: enrique

## Context

RUNE is not a Hive-native smart contract token. It is a season-scoped,
non-transferable Ragnarok balance derived by replaying Hive `custom_json`
operations through `protocol-core`.

That makes the anti-cheat question different from token custody. There is no
contract account that can reject transfers on-chain. The protocol reader must
make forged balances impossible by treating Hive as an ordered event log and
the shared replay implementation as the interpreter.

The high-risk ambiguity is ownership of a balance mutation. If a payload can
name the credited or debited account freely, a signed op can become a forged
bank transfer. RUNE therefore needs an explicit owner rule.

## Decision

Adopt a bank-ledger model for RUNE:

- Every `RuneLedgerEntry` has exactly one RUNE balance owner in `entry.account`.
- For self-directed RUNE ops (`campaign_result`, `daily_quest_claim`,
  `reward_claim`, `rune_exchange`), the owner is the authenticated Hive
  `op.broadcaster`.
- Payload account fields are not authority for RUNE ownership. They are ignored
  or rejected depending on the op shape.
- For ranked P2P, the owner is the winner or loser account proven by
  winner-posted `match_result` replay ([ADR 0008](./0008-winner-posted-match-result.md)).
  The payload `winner` field alone cannot choose the credited owner.
- Ranked P2P settlement requires a prior dual-anchored `match_anchor` plus
  transcript replay (and, when live, a Terminal Checkpoint Receipt). A
  result-only match is not enough to credit RUNE. The loser does not
  countersign game_over.
- Amounts are computed from source type, season config, account, source key,
  and pack quote. Client-supplied RUNE amounts are invalid.
- Balance mutation must happen through a ledger entry. Scalar balances are
  replay projections and drift-detection surfaces, not independent authority.
- P2P source keys include match, role, and owner:
  `p2p:S01:{matchId}:{winner|loser}:{account}`. The match is consumed by prefix
  `p2p:S01:{matchId}:` so the same match cannot settle a second, conflicting
  winner.

## Consequences

- RUNE keeps the same operational shape as a bank ledger: signed events in,
  computed ledger entries out, balances derived from replay.
- The `rune_ledger` module becomes the test surface for balance correctness.
  Tests should assert owner derivation, source-key idempotency, caps, and drift.
- Direct RUNE balance writes outside the ledger helper are protocol bugs unless
  they are rebuilding a projection from existing ledger state.
- Future P2P loser rewards can be enabled without changing the ledger contract;
  they use the `loser` role source key and the same per-account P2P cap.
- Any future transfer-like feature would contradict this ADR and must be
  recorded as a new ADR before implementation.
