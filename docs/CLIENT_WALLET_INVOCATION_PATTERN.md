# Client Wallet Invocation Pattern

Status: launch hardening rule, 2026-05-19.

For the current gameplay-only P2P testnet, Quick Match has one explicit
match-start ceremony: `Offer → Accept → Ready`. Queue/search and status polling
create **zero** wallet invocations; each player signs exactly once on the
visible `Accept` action. After `Accept`, reconnect/reload and `game_over` create
zero additional wallet invocations.

In F1 this boundary also covers local campaign and daily-quest settlement:
local replay commits first and no Keychain/broadcast is involved. Login is an
identity action; it is not permission to invoke a wallet during gameplay.

Hive Keychain prompts are browser-client actions. Server adapters, replay
indexers, polling loops, mounted panels, match-end effects, and background
queues MUST NOT open Keychain directly.

## Rule

Every Keychain prompt must cross a client wallet invocation seam:

1. The UI shows a concrete user action such as Claim, Open pack, Buy, Transfer,
   Authorize session, or Submit evidence.
2. The click handler creates a `ClientWalletInvocation` with the expected action
   kind and authority.
3. The wallet-facing store/component receives that invocation and only then calls
   `HiveSync`, `HiveAuth`, or a bridge method that opens Keychain.

The current TypeScript seam is:

- `client/src/data/wallet/clientWalletInvocation.ts`

## Not Allowed

- `useEffect` opening Keychain after mount.
- `setInterval` or background processors opening Keychain.
- Match-end lifecycle opening Keychain.
- Server REST routes asking the browser to sign implicitly.
- Local/dev adapters delegating to `HiveSync` just because a Hive username is
  present in the browser.

## Current Hardening

- F1 daily quests commit locally after the gameplay action; no wallet Claim is
  needed. Future F2 explicit claims remain behind this invocation seam.
- DUAT airdrop pack claims now require an explicit Claim Packs wallet action.
- DUAT pack opening no longer burns the next pack from a mount effect. Each pack
  burn is invoked by an explicit Open pack action.
- `LocalNFTBridge` rejects RUNE/HBD pack wallet actions instead of delegating to
  `HiveSync`.
- `transactionProcessor` no longer drains queued transactions with Keychain in
  Hive mode. Manual Hive queue submission requires `ClientWalletInvocation`.
- P2P ranked result signing is deferred instead of calling `signResultHash` from
  the match-end subscriber or from inbound `result_propose` handling.
- P2P slash evidence is captured as deferred evidence instead of broadcasting
  from hash-check or result-proposal handlers.

## Remaining Migration Targets

- Quick Match `Accept` is the current visible wallet surface for the
  match-specific Posting proof. `session_authorize` carries that same proof
  into the P2P handshake and must not prompt again.
- Future P2P ranked settlement winner `match_result` review (end) still needs a
  separate visible wallet surface ([ADR 0008](./adr/0008-winner-posted-match-result.md)).
  There is no loser `result_countersign`. Disabled on the gameplay-only testnet.
- The transaction queue needs a visible wallet outbox UI for manual Hive
  submission and retry.
- `slash_evidence` needs a durable evidence queue and a Submit evidence action.
- Future ranked/on-chain matchmaking `queue_join` / `queue_leave`, Collection
  custody/crafting actions, Marketplace actions, Admin, and Treasury still use
  direct button handlers and should be migrated through the same invocation
  wrapper for consistency. Quick Match queue/search is unsigned server
  matchmaking and reuses the HTTP login session; only `Accept` uses the
  `p2pMatchAcceptance` wallet seam.
- Campaign result publishing should be reviewed against the same rule before
  public beta.
