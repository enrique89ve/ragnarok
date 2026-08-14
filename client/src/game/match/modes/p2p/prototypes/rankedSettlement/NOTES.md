# PROTOTYPE - P2P Ranked Settlement / Winner Arbiter

Question: how can QA full-catalog show local RUNE/XP reward feedback while
keeping economic ranked settlement blocked until dual-signed evidence exists?

Run:

```bash
pnpm run prototype:p2p-settlement
```

Useful presets:

- `1` QA local reward flow: shows `+2` RUNE preview and match XP locally, but
  chain RUNE remains `0` and CardXP remains `0`.
- `2` full NFT happy path: dual anchor, deterministic transcript, visible review,
  both signatures, arbiter verify -> `+2` winner RUNE.
- `3` result-only: local result without dual anchor -> blocked.
- `4` transcript mismatch: honest-looking result with divergent roots -> blocked.
- `5` hidden prompt: no visible review -> blocked.
- `6` disconnect before final signatures -> no settlement.

Current read from the prototype:

- Local victory is only UX state.
- QA full-catalog may show reward feedback, but it is local/session scoped:
  no RUNE ledger, no NFT CardXP, no `level_up`.
- The projected RUNE value is calculated from `TESTNET_RUNE_ECONOMY.p2pWinRune`;
  the prototype's match/profile XP is local-only rehearsal state and must not be
  persisted as CardXP or NFTLox `mutableData`.
- Ranked settlement begins at prior dual `match_anchor`, not at game-over.
- Transcript ordering must be deterministic before result review can be reliable.
- Keychain should only open from a visible result review action.
- Disconnect/timeout needs a separate claim protocol; until then it stays
  no-settlement.
- Any real QA preview cache must include stage, protocol id, reset epoch,
  account, and match id, and must be ignored or purged before render when any of
  those fields changes.

The Closed Beta winner-arbiter gates are now formalized in
`docs/P2P_WINNER_ARBITER.md`. Delete this folder once production arbiter tests
cover the same scenarios, or keep it only as a throwaway demo until then.
