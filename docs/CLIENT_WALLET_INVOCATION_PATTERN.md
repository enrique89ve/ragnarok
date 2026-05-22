# Client Wallet Invocation Pattern

Status: launch hardening rule, 2026-05-19.

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

- Daily quests now stay `Pending` until the player clicks Claim.
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

- P2P ranked settlement `session_authorize` and `result_countersign` need
  visible authorize/sign surfaces before P2P RUNE/ELO is enabled. Closed-beta
  full NFT gameplay currently skips the `session_authorize` Posting prompt.
- The transaction queue needs a visible wallet outbox UI for manual Hive
  submission and retry.
- `slash_evidence` needs a durable evidence queue and a Submit evidence action.
- Future ranked/on-chain matchmaking `queue_join` / `queue_leave`, Collection
  custody/crafting actions, Marketplace actions, Admin, and Treasury still use
  direct button handlers and should be migrated through the same invocation
  wrapper for consistency. Closed-beta full NFT Quick Match uses unsigned server
  matchmaking so battle search does not request a Posting signature.
- Campaign result publishing should be reviewed against the same rule before
  public beta.
