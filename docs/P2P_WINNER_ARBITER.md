# P2P Winner Arbiter - Closed Beta Readiness Spec

**Canon:** ranked settlement is
[`ADR 0008`](./adr/0008-winner-posted-match-result.md) (winner-posted
`match_result`, Terminal Checkpoint Receipt, replay on the indexer, loser does
not countersign `game_over`). This file is the fail-closed verifier checklist
for that ADR. If this file and ADR 0008 disagree, **ADR 0008 wins**.

## Status

**Deferred future ranked-settlement design.** It is not required to complete the
current gameplay-only P2P testnet defined by
[`ADR 0007`](./adr/0007-p2p-gameplay-only-testnet.md).

Required before any later activation of ranked P2P RUNE, ELO, Season Score,
CardXP or Hive `match_result` broadcast.
Until this lands, P2P game-over may show QA local reward feedback only in a QA
full-catalog reset epoch; it must not broadcast `match_result` or credit
`p2p_ranked` RUNE.

## Scope

The winner arbiter is a replay verifier for ranked P2P results. It is not a live
server referee and it is not campaign/local AI validation.

It applies only to the P2P ranked/full NFT settlement path:

- `campaign_result` remains the campaign RUNE path.
- local AI and casual matches remain non-ranked.
- QA full-catalog P2P may display local reward feedback, but it is never NFT
  custody, CardXP, Season Score, ELO, or RUNE ledger evidence.
- result-only evidence remains rejected.

## Required Inputs

A settlement candidate must include:

- `matchId`, `seasonId`, runtime stage, protocol id, and reset epoch;
- two Hive participants and their anchored session public keys;
- prior dual `match_anchor` evidence for the same match and participants;
- deck evidence resolved before match start, with `nft_custody` required for
  economic ranked settlement;
- a pre-match deck verification decision tied to the deck hashes pinned by the
  anchor, not raw client-submitted claims alone;
- engine hash, registry hash, deck hashes, and seed commitments pinned by the
  anchor once those fields are present in the match-result contract;
- deterministic transcript root from the transcript finalizer and optional
  transcript CID;
- winner, loser, and final result facts derived from replay;
- the **winner** signature over the compact match-result commitment using the
  `ragnarok match_result v1` domain prefix, verified against the winner pubkey
  pinned by `match_anchor`. The loser does not countersign game_over
  ([ADR 0008](./adr/0008-winner-posted-match-result.md)).

## State Machine

1. `anchored`: both peers have signed/anchored the match start. Single-anchor
   matches cannot settle.
2. `game_over_local`: a peer sees a final board result. This is UI state only.
3. `review_visible`: the result review UI shows the winner, loser, transcript
   root, and reward consequences. The winner's Keychain prompt starts only from
   this visible action.
4. `winner_posted`: the winner signed and broadcast `match_result`. The loser
   does not countersign.
5. `arbiter_pending`: the indexer/observer replays the anchored transcript.
6. `verified`: replay winner matches payload winner; apply `p2p_ranked` RUNE
   and ELO. Hive stored the op; it did not choose the winner.
7. `rejected`: no settlement. The UI may show a dispute/retry/export path, but
   it must not credit RUNE.

## Verification Gates

The arbiter must fail closed unless every gate passes:

| Gate | Reject reason |
|---|---|
| Prior dual `match_anchor` exists | `ranked match requires dual-anchored match_anchor` |
| Anchor pins participant keys | `match_anchor is missing pinned pubkeys` |
| Result participants match anchor participants | `match_result participants do not match match_anchor` |
| Economic deck evidence is full NFT custody | `full NFT ranked requires nft-custody deck evidence` |
| NFT custody evidence was verified before match start and matches pinned deck hashes | `full NFT ranked requires nft-custody deck evidence` |
| Transcript root exists and is deterministic | `missing signed transcript roots` |
| Local/remote transcript roots match | `transcript_root_mismatch` |
| Winner is a participant and matches replay | `winner mismatch` |
| Result review was visible before the winner signed | `visible result review/sign flow required before Keychain` |
| Winner signature verifies against the winner pubkey pinned by the anchor | `ranked match_result signatures must verify against anchored pubkeys` |
| Winner posted the result; loser game_over signature is not required | `ranked match_result requires the winner signature` |
| QA full-catalog is not used as economic evidence | `QA full-catalog rewards are local feedback` |

## Implementation Plan

1. Extract an importable P2P-only arbiter contract with typed candidate,
   decision, and rejection reasons. Keep it out of campaign/local AI modules.
   - Slice 1 lives at
     `client/src/game/match/modes/p2p/winnerArbiter.ts`. It verifies typed
     candidates and returns fail-closed effects. It now requires pre-match
     deck verification, deck hashes matching the anchor, deterministic
     transcript finalizer evidence, and signatures already verified against
     anchored pubkeys. It is not wired to `onP2PMatchEnd` yet.
2. Add a deterministic transcript finalizer so both peers hash identical ordered
   leaves before the review screen opens.
3. Replace the current result-signature stub with a visible review/sign flow.
   Hidden or automatic Keychain prompts stay blocked.
4. Implement verifier tests for: happy full NFT ranked, result-only, transcript
   mismatch, hidden prompt, QA full-catalog, disconnect before signatures, and
   anchor participant mismatch.
5. Wire `onP2PMatchEnd` to submit only **winner-posted** candidates that pass
   replay + (when live) Terminal Checkpoint Receipt. Keep settlement deferred
   until two-browser smoke passes.
6. Enable `match_result` broadcast behind one runtime gate after Closed Beta
   sign-off. Follow [ADR 0008](./adr/0008-winner-posted-match-result.md).

## Acceptance

- `pnpm run check` passes.
- Focused arbiter tests cover every gate above.
- `pnpm run prototype:p2p-settlement -- --demo` still shows QA local rewards as
  local/no-chain and result-only as blocked, or the prototype is deleted after
  equivalent production tests replace it.
- Two-browser P2P smoke exports evidence for `match_anchor`, transcript root,
  visible winner review, Terminal Checkpoint Receipt, and final `match_result`.
- Wallet and `/api/chain/rune/*` show no P2P RUNE for QA full-catalog or failed
  arbiter submissions.

## Deferred

- Timeout/disconnect win claims.
- Always-on server simulation.
- Campaign transcript replay.
- NFTLox `mutableData` writes from QA cards.
