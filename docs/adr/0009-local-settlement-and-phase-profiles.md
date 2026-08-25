# ADR 0009 — Local settlement and versioned phase profiles

**Status:** Accepted

## Problem

Gameplay validation needs complete, replayable progression without turning test
evidence into Hive value or prompting a wallet. Deployment labels alone cannot
express that boundary safely.

## Decision

Phase 1 (`local-gameplay-v1`) uses browser IndexedDB/replay as the authority
for local settlement and progression. `local_match_settlement_v1` and
`local_campaign_settlement_v1` are local envelopes containing anchor/result
objects and idempotent projections. They are not Hive operations and cannot be
forwarded as `custom_json`.

The phase policy is action-level. F1 permits identity login and local
settlement, but blocks Hive broadcast, wallet invocation, marketplace, packs,
NFTLox writes, campaign publication and official ranking. P2P, campaign and
daily quests remain fully testable without external authority.

Migration uses a complete fingerprint and fails closed before server state
mutation. It carries preferences/accessibility/decks, archives evidence,
resets economic/ownership projections, and never promotes local settlement or
economy.

## Authority flow

```text
game end → local envelope → one atomic IDB transaction → local projections
                 │                 ├─ duplicate event → already_applied
                 │                 └─ changed payload → conflict
                 └── no Hive op / Keychain / outbox / NFTLox in F1
phase change → fingerprinted dry-run → carry/archive/reset, never promote
server load → assert fingerprint → only then mutate Maps
```

Atomic IDB commits make local RUNE, ELO, SeasonScore, CardXP and level-ups
idempotent. A repeated event is `already_applied`; a material change with the
same event ID is `conflict` and does not overwrite the original.

## Rejected alternatives

- UI-only flags would leave HiveSync, protocol-core or server paths reachable.
- Reusing a volume with manual browser cleanup cannot prove namespace isolation.
- Promoting local RUNE/ELO/CardXP would turn resettable test evidence into
  unsupported canonical value.

## Consequences

Local persistence gives testers meaningful replayable progression without wallet
friction, but it is not proof of Hive ownership or official ranking. Separate
namespaces cost storage and migration work while preventing stale replay bleed
and accidental economic promotion. F2/F3 Hive settlement remains deferred
behind profile and wallet gates.

See [the capability matrix](../PROTOCOL_CAPABILITY_MATRIX.md) and [the migration runbook](../PHASE_MIGRATION_RUNBOOK.md).

## Migration boundary

Preferences, accessibility and saved decks may carry. Transcripts and local
campaign/daily evidence archive. Local economy, progression, ownership,
outbox and settlement never promote. A server fingerprint mismatch is raised
before any state Map is cleared or populated.

## Verification

Focused protocol, replayDB, migration and chain-state tests cover deterministic
plans, IDB idempotence/conflict, complete fingerprints and fail-closed loading.
Deployed smoke and browser QA remain operational checks.
