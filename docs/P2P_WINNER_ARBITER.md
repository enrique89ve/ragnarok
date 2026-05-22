# P2P Winner Arbiter - Closed Beta Readiness Spec

## Status

Required before enabling closed-beta ranked P2P RUNE, ELO, or Season Score.
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
- both peer signatures over the same compact match-result commitment using the
  `ragnarok match_result v1` domain prefix, verified against the public keys
  pinned by `match_anchor`.

## State Machine

1. `anchored`: both peers have signed/anchored the match start. Single-anchor
   matches cannot settle.
2. `game_over_local`: a peer sees a final board result. This is UI state only.
3. `review_visible`: the result review UI shows the winner, loser, transcript
   root, and reward consequences. Keychain prompts must start only from this
   visible action.
4. `dual_signed`: winner and loser sign the same compact commitment.
5. `arbiter_pending`: the verifier checks the envelope against anchors,
   transcript, signatures, and replay.
6. `verified`: the client/server may broadcast or accept `match_result`; replay
   may apply `p2p_ranked` RUNE and ELO.
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
| Result review was visible before signing | `visible result review/sign flow required before Keychain` |
| Signatures verify against anchored participant keys | `ranked match_result signatures must verify against anchored pubkeys` |
| Winner and loser both signed the same commitment | `ranked match_result requires winner and loser signatures` |
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
5. Wire `onP2PMatchEnd` to submit only verified dual-signed candidates. Keep the
   current deferred settlement event until all verifier tests and two-browser
   smoke pass.
6. Enable `match_result` broadcast behind one runtime gate, then remove the
   gate only after Closed Beta acceptance signs off.

## Acceptance

- `npm run check` passes.
- Focused arbiter tests cover every gate above.
- `npm run prototype:p2p-settlement -- --demo` still shows QA local rewards as
  local/no-chain and result-only as blocked, or the prototype is deleted after
  equivalent production tests replace it.
- Two-browser P2P smoke exports evidence for `match_anchor`, transcript root,
  visible result review, dual signatures, and final `match_result`.
- Wallet and `/api/chain/rune/*` show no P2P RUNE for QA full-catalog or failed
  arbiter submissions.

## Deferred

- Timeout/disconnect win claims.
- Always-on server simulation.
- Campaign transcript replay.
- NFTLox `mutableData` writes from QA cards.
