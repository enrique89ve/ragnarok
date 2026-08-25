# Testnet phases

The runtime profile, not the deployment label, decides authority. Canonical
definitions are in [`shared/protocolPhase.ts`](../shared/protocolPhase.ts).

## Runtime mapping

| Runtime phase | Protocol profile | Authority boundary |
|---|---|---|
| `local` | F1 `local-gameplay-v1` | IndexedDB/replay local authority |
| `qa-season-0` | F1 `local-gameplay-v1` | IndexedDB/replay local authority |
| `alfa-testnet` | F1 `local-gameplay-v1` | IndexedDB/replay local authority |
| `generic-testnet` | F1 `local-gameplay-v1` | IndexedDB/replay local authority |
| `closed-beta` | F2 `hive-testnet-v1` | Hive replay, explicit wallet only |
| `mainnet` | F3 `mainnet-v1` | Hive canonical authority |

The mapping is implemented by `getProtocolPhaseId`; changing
the deployment label alone cannot promote local economy.

Launch identity is the fingerprint, not the npm script name.
`VITE_NETWORK_STAGE` is only `local | testnet | mainnet`. Alfa vs Closed Beta
is selected by `VITE_RAGNAROK_RESET_EPOCH` (`alfa-testnet-*` vs
`closed-beta-*`). Server mirrors (`RAGNAROK_RESET_EPOCH`,
`RAGNAROK_PROTOCOL_ID`, `RAGNAROK_SEASON_START`,
`RAGNAROK_INDEX_START_BLOCK`) must equal the `VITE_*` values on a shared
host. Changing the epoch is a wipe, not a restart; see
[`ENV_SECURITY.md`](./ENV_SECURITY.md) § Restart isolation.

## Phase 1 — Gameplay Validation

`phaseId=local-gameplay-v1`, settlement `local-replay`, economy
`local-simulation`, wallet policy `login-only`.

Testers can validate single-player matches, campaign, daily quests, P2P
chess/poker, quests, replay and local progression. A terminal match persists a
versioned local envelope in IndexedDB/replay: `local_match_settlement_v1`
contains local anchor/result objects and projects RUNE, ELO, SeasonScore, Card
XP and level-ups locally. Campaign uses `local_campaign_settlement_v1`.

Local development has one deliberate QA affordance: `dev/local` lets a clean
browser reveal the starter entitlement and run Single without Hive login or a
wallet extension. This is the supported path for structural browser automation
and LLM testers. It does not apply to the shared Alfa deployment: shared Alfa
still requires an account identity before starter, social or P2P flows. Once
that identity exists, an F1 starter receipt is server-issued without a second
Keychain signature. Shared-network P2P queue join also uses that identity
without a second Posting signature. Gameplay, claims and `session_authorize`
must not invoke the wallet. Anonymous progress sentinels (`guest`, legacy
`local`) are reserved for `dev/local` IndexedDB only. Shared Alfa/testnet
never writes RUNE, ELO, SeasonScore or CardXP under those ids.

On phones, every live match route (`single`, `campaign` and `multiplayer`) uses
the shared `GameOrientationGate`: portrait mode hides and disables the combat
surface and asks the player to rotate the device; landscape mode exposes the
single 1920x1080 virtual battlefield. Battle preparation is landscape-first as
well: warband/hero selection and the deck builder ask the player to rotate, so
the choice grid, selected army and launch action remain visible together.
Information surfaces such as Atlas and the campaign map remain usable in
portrait, but gain a compact landscape composition; Atlas presents map and
dossier side by side on short phone viewports. This keeps the play loop aligned
with landscape-first mobile games without forcing a second vertical combat
layout or trapping light browsing in one orientation. The installed PWA also
declares `orientation: landscape` in its manifest; the in-app gates remain the
browser fallback when an orientation lock is unavailable.

These are not Hive operations. F1 never emits canonical `match_anchor` or
`match_result`, canonical RUNE ledger entries, official ranking, NFT CardXP,
Hive `level_up`, IPFS, outbox, `custom_json`, or a wallet prompt. Identity login
is allowed; wallet invocation is not. Marketplace, packs and NFTLox writes are
disabled and must not mount mutation surfaces.

## Phase 2 — Hive testnet replay

`phaseId=hive-testnet-v1`, settlement `hive-replay`, economy `hive-testnet`,
wallet policy `explicit-only`. Hive replay and explicit wallet actions are
available. Marketplace, packs, NFTLox writes and official ranking remain off
under the current policy.

## Phase 3 — Mainnet

`phaseId=mainnet-v1`, settlement `hive-canonical`, economy `canonical`, wallet
policy `explicit-only`. Marketplace, packs, NFTLox writes and official ranking
are enabled by policy.

## Tester journey

1. In local F1 development (`pnpm run dev`), exercise Single without login for
   browser/LLM QA. To rehearse the launched Alfa on localhost, use
   `pnpm run dev:alfa-testnet` with Hive identity — not `dev:testnet`.
   In shared Alfa, establish identity before starter/social/P2P flows. Then
   play single-player, campaign, daily quests and P2P, retry a match/claim and
   inspect the local replay projection.
2. In F2, explicitly opt into wallet actions and verify Hive replay behavior;
   marketplace, packs, NFTLox writes and official ranking remain disabled.
3. In F3, use the canonical Hive and economy surfaces only after their phase
   gates pass.

## Entry gates

- F1 requires a complete runtime fingerprint, a fresh/resettable local
  namespace and passing local settlement/progression tests. No wallet prompt is
  an entry requirement.
- F2 requires a new `resetEpoch`, a matching server fingerprint, Hive replay
  configuration and explicit wallet UX. It does not enable market, packs,
  NFTLox or official ranking.
- F3 requires a matching mainnet fingerprint, canonical chain configuration and
  an explicit operational approval for external economy writes.

## Exit gates

- F1 exits only after local single/campaign/daily/P2P evidence is repeatable,
  idempotent and externally silent; local RUNE/ELO/SeasonScore/CardXP/level-ups
  are evidence, not canonical value. All phone match routes must also be
  blocked in portrait and playable through the shared landscape battlefield.
- F2 exits only after Hive replay is verified and its disabled capabilities remain
  hard-gated; no local economy is promoted.
- F3 exits after canonical smoke, wallet and economy checks are approved by the
  operator. These are operational gates, not implied by unit tests.

## Evidence status

The phase modules and focused tests verify contracts, persistence, idempotence,
fingerprint rejection and capability boundaries. The current local Alfa build
also has browser evidence for no-login local Single, landscape preparation and
combat, responsive Atlas, disabled market/packs and runtime APIs. The public
host configuration has been inspected, but the current workspace tree is not
yet deployed there. A real two-account/Keychain P2P smoke and a played browser
victory for the first Norse campaign mission remain operational evidence.

Before changing phase, use the [migration runbook](./PHASE_MIGRATION_RUNBOOK.md).
Migration never promotes local economy or progression. Code/tests validate the
boundaries; deployed smoke and browser visual QA remain operational checks.
