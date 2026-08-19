# P2P Security Hardening — Design & Implementation

> **Status**: Historical — absorbed.
>
> Los cinco invariantes de este documento (match session binding, gameState
> authenticity, identity binding, result proposal correlation, dual-sig sin
> fallback) ya son canon en
> [`PVP_WIRE_PROTOCOL.md`](./PVP_WIRE_PROTOCOL.md) (hardening invariants).
> Este archivo se conserva como registro de decisiones; no editar para reflejar
> el estado actual.
>
> **OPEN-8 note (2026-08-19):** the body below still talks about host
> `gameState` at ~2/sec. Live cards path no longer dumps forward state;
> host `gameState` is recovery-on-`hash_mismatch` only. Integrity is
> `prevStateHash` on `game_command` plus host `hash_check`.

**Status**: Implementing
**Date**: 2026-03-19
**Affects**: `useWireSync.ts`, `peerStore.ts`, `BlockchainSubscriber.ts`

---

## Issues & Fixes

### 1. Match Session Binding (Missing Match ID)

**Problem**: No token binds P2P connection to a specific match. Replay attacks possible.

**Fix**: Generate `matchId = SHA256(matchSeed + hostPeerId + clientPeerId)` during seed exchange. Include in all action messages. Reject messages with wrong matchId.

### 2. GameState Authentication

**Problem**: `gameState` messages have no signature. Host can send fabricated state.

**Fix**: Add `stateHash: SHA256(turnNumber + gamePhase + playerHP + opponentHP)` to gameState messages. Client verifies hash matches received state. Not a full signature (too expensive at 2/sec), but detects tampering.

### 3. Identity Binding (Hive Account → Peer ID)

**Problem**: PeerJS peer ID is just a UUID, not cryptographic identity. Anyone can claim any ID.

**Fix**: During seed_reveal phase, include Hive username. After seed exchange completes, both peers know each other's Hive account. deck_verify cross-references this. Attacker can't forge Hive signatures.

### 4. Result Proposal Correlation

**Problem**: Two simultaneous result_propose messages can cause wrong signatures to pair.

**Fix**: Add `proposalId: crypto.randomUUID()` to result_propose. result_countersign must echo the same proposalId. Reject mismatches.

### 5. Enforce Dual-Sig (No Single-Sig Fallback)

**Problem**: If client doesn't countersign in 30s, host broadcasts with empty signature. Chain may reject (good) but wastes transactions.

**Fix**: On timeout, mark result as "disputed" — don't broadcast. Both players can submit slash evidence if they believe opponent griefed. No single-sig broadcasts for ranked matches.
