# ADR 0008 — Winner-posted match result

**This ADR is the single source of truth for ranked P2P settlement.** Other
docs must point here. If they disagree, this file wins.

**Status**: Accepted  
**Date**: 2026-08-20  
**Deciders**: enrique  
**Supersedes**: dual-signature of `match_result` at game_over in
[`RAGNAROK_PROTOCOL_V1`](../RAGNAROK_PROTOCOL_V1.md) §10.13 and
[`P2P_WINNER_ARBITER`](../P2P_WINNER_ARBITER.md). Does **not** supersede
dual `match_anchor` at match start, nor [ADR 0007](./0007-p2p-gameplay-only-testnet.md)
(Alfa P2P stays gameplay-only; this ADR is the ranked contract for later).

## Product rule (lock this)

End of match is a **match event**, not a vote.

The loser will not sign a document that lowers ranking. Ranked LP in a live
service never waits for the losing side to accept the loss. The winning
account publishes. Validation is replay, not consent.

Hive does not understand chess or poker. It stores bytes. The game
(`protocol-core` on the indexer/observer) decides whether those bytes are a
legal prize.

## Layers

| Layer | Job | Must not |
|---|---|---|
| Two clients | Play the spine; sign own moves with session keys | Invent official ELO |
| Relay | Opaque checkpoints; on `* → game_over` match, mint **one** Terminal Checkpoint Receipt | Name a winner, simulate hands |
| Winner client | Visible review, Hive-sign `match_result`, include the receipt | Publish if they are not the replay winner |
| Hive | Irreversible log | Judge gameplay |
| Indexer / observer | Replay transcript + check receipt + credit once | Own ranking in Postgres |

## Happy path (Closed Beta ranked)

```
both Hive-sign match_anchor          // they want to play ranked
both sign their own moves            // session keys from the anchor
chess ↔ poker … terminal checkpoint  // two opaque roots match
relay mints one receipt hash         // matchId + stateRoot + epoch + nonce
                                     // receipt does NOT contain winner
winner sees review UI, Keychain once
winner broadcasts match_result
  { winner, loser, transcriptRoot, receiptHash }
indexer:
  receipt unused and bound to this matchId + terminal root
  replay(transcript) === payload.winner
  broadcaster === winner
  matchId not already paid
→ one RUNE/ELO apply
```

## Failure table

| What happens | Settlement |
|---|---|
| Loser refuses to open Keychain | Irrelevant. They are not asked. |
| Loser disconnects **after** terminal checkpoint | Winner still posts. Receipt exists. Replay pays if the board is terminal. |
| Loser disconnects **before** terminal checkpoint | No receipt. Happy-path `match_result` rejected. Later `forfeit_claim` (deferred): anchor + silence + reconnect window. Not “I declare I won”. |
| Both publish “I won” | One `match_id` pays once. Replay picks. The liar is reject/slash (`double_result`). Receipt is single-use, so the second post cannot recycle it. |
| Winner posts but replay says the other account | Reject. Hive keeps the JSON; game state does not move. |
| No `match_anchor` / QA full-catalog | Not economic ranked. Local UX only. |
| Server “was told” the winner over the socket | Invalid. Relay only saw matching opaque roots. |

## Terminal Checkpoint Receipt

Issued only when the relay commits `* → game_over` (ADR 0005). Fields the
winner copies into the payload:

- `matchId`
- `stateRoot` (32-byte committed root)
- `receiptHash` = keyed hash over those plus relay nonce/epoch
- one-shot: first successful apply consumes it

Alfa may keep emitting checkpoint **commits** without minting this receipt
for Hive. Ranked beta must mint and consume it.

## Alfa now

No `match_anchor`, no `match_result`, no receipt-for-Hive, no P2P RUNE/ELO.
`game_over` is local tester evidence.

## Closed Beta slices (order)

1. Keep winner-posted arbiter gates (already in `winnerArbiter.ts` / `apply.ts`).
2. Transcript finalizer: one canonical leaf order both peers hash.
3. Winner-only visible review + Keychain on `match_result`.
4. Relay receipt mint on terminal checkpoint commit; apply consumes it.
5. Runtime gate off until two-browser smoke with export of anchor, receipt,
   transcript root, and one Hive `match_result`.
6. Forfeit/timeout claim last. Do not block Alfa or happy-path ranked on it.

## Rejected designs

- Loser countersign at `game_over`.
- Postgres ELO as authority, later “synced” to Hive.
- Server-authored winner inside the receipt.
- Single-client result-only settlement without transcript + receipt.
