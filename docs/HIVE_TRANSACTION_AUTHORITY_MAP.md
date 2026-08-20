# Hive Transaction Authority Map

Status: audit draft, 2026-05-19.

Current P2P activation is resolved by
[`ADR 0007`](./adr/0007-p2p-gameplay-only-testnet.md): login may use Keychain
before matchmaking, while `match_anchor`, `session_authorize`,
`session_renewal`, `match_result` and every match-driven wallet prompt are
disabled for the gameplay-only testnet.

This document maps the Hive operations Ragnarok needs, who should sign them,
and whether they belong to the browser wallet or to the server/operator side.
When docs and code disagree, this audit treats code as the current runtime
truth and calls out the disagreement.

Primary sources:

- Client broadcaster: `client/src/data/HiveSync.ts`
- Wallet invocation seam: `client/src/data/wallet/clientWalletInvocation.ts`
- Runtime protocol ids: `shared/runtimeConfig.ts`
- Canonical action and auth sets: `shared/protocol-core/types.ts`
- Op normalization: `shared/protocol-core/normalize.ts`
- Replay handlers: `shared/protocol-core/apply.ts`
- Server indexer contract: `docs/HIVE_INDEXER_CONTRACT.md`
- External NFT custody layer: `docs/NFTLOX_INTEGRATION_SPEC.md`
- Wire specs: `docs/RAGNAROK_PROTOCOL_V1.md`, `docs/RUNE.md`, `docs/PVP_WIRE_PROTOCOL.md`

## Surfaces

```mermaid
flowchart LR
	subgraph Browser[Browser client]
		W[Hive Keychain]
		UI[Game UI and stores]
		HiveSync[HiveSync]
		P2P[P2P wire]
	end

	subgraph Hive[Hive L1]
		CJ[custom_json ops]
		TR[transfer ops]
	end

	subgraph Server[Server]
		Auth[REST auth verifier]
		Indexer[LIB chain indexer]
		ReadAPI[/api/chain reads]
		Witness[match pending witness signer]
		Treasury[Treasury multisig coordinator]
	end

	UI -->|login/auth message| W
	W -->|requestSignBuffer Posting| UI
	UI --> HiveSync
	HiveSync -->|requestCustomJson Posting or Active| W
	W --> CJ
	HiveSync -->|requestBroadcast Active: transfer + custom_json| W
	W --> TR
	W --> CJ

		P2P -->|planned result review| W
		W -->|dual Posting signatures, off-chain| P2P
	P2P --> HiveSync

	CJ --> Indexer
	TR --> Indexer
	Indexer --> ReadAPI
	UI --> ReadAPI

	UI -->|signed REST body/header| Auth
	Auth -->|verifies current Hive posting key| UI

	UI -->|opaque pending envelope| Witness
	Witness -->|server Posting witness signature, not a Hive tx| UI

	Treasury -->|build unsigned tx| UI
	UI -->|submit signer signatures| Treasury
	Treasury -->|broadcast signed Hive tx after threshold| Hive
```

## User Roles

Ragnarok has two protocol roles:

- `player`: normal Hive account. Can sign its own claims, gameplay results,
  queue presence, RUNE spend, and custody actions for assets it owns.
- `admin`: one configured admin account. Can perform every player action when
  it is also the relevant owner/signing account, plus admin-only supply and
  distribution actions such as `genesis`, `seal`, `mint_batch`, `pack_mint`,
  `pack_distribute`, `pack_transfer`, and `duat_airdrop_finalize`.

There is no third gameplay authority role. The server is an indexer, witness,
or treasury coordinator, not a gameplay signer.

## Starter Is Not A Chain Claim

Starter is a universal entitlement, not a purchased or claimed pack asset.
The starter ceremony may write account-scoped local state such as "revealed"
or seed the default hero decks. It MUST NOT request Keychain as proof of card
ownership and MUST NOT broadcast a Hive operation.

For shared-network P2P gating, the server may additionally store a signed
starter ceremony receipt via `/api/starter/claim`. That receipt is not card
ownership and is not a Hive broadcast; it is an operational gate proving the
Hive account explicitly passed the onboarding ceremony before entering public
matchmaking.

## Client Wallet Invocation Seam

Keychain prompts are client wallet actions. Server adapters, replay indexers,
polling loops, mounted panels, match-end effects, and local/dev adapters MUST
NOT open Keychain directly. Visible UI intent creates a
`ClientWalletInvocation`, then the wallet-facing module may call `HiveSync`,
`HiveAuth`, or a bridge method that opens Keychain.

The full rule lives in [CLIENT_WALLET_INVOCATION_PATTERN.md](./CLIENT_WALLET_INVOCATION_PATTERN.md).

## Client Wallet Operations

These are signed in the browser. The server can read, index, verify, or cache
the resulting state, but it should not become gameplay truth.

| Operation | Current signer | Hive key | Runtime status |
|---|---:|---|---|
| `login` / REST auth body | player | Posting message signature, no chain op | Live. Used by Hive login and signed REST bodies. |
| `queue_join` | player | Posting custom_json | Live in Hive mode via `broadcastQueueJoin`; includes PoW. |
| `queue_leave` | player | Posting custom_json | Live; best-effort cancel path. |
| `match_anchor` | both participants (dual-anchored) | Posting custom_json | **Future ranked** ([ADR 0008](./adr/0008-winner-posted-match-result.md)). Alfa does not sign or broadcast it. |
| `match_result` | **winner only** | Posting custom_json + winner signature + Terminal Checkpoint Receipt | **Future ranked** (ADR 0008). Loser does not countersign. Alfa neither signs nor broadcasts; local `game_over` only. |
| `campaign_result` | player | Posting custom_json | Live. Broadcaster is the campaign/RUNE owner. Payload usernames are omitted/ignored. |
| `daily_quest_claim` | player | Posting custom_json | Live. Progress is local; explicit Claim button invokes Keychain. Chain validates date/slot/idempotency and computes flat reward. |
| `reward_claim` | player or tournament flow | Posting custom_json | Method exists; tournament server path is still pending/deferred. |
| `rune_exchange` | player | Posting custom_json | Live. Debits replay-derived RUNE and creates sealed packs through replay adapter. |
| `level_up` | owner | Posting custom_json | Queued after local XP update when derived NFT level increases. In Hive mode, queued submissions require a visible wallet outbox action. |
| `pack_commit` | player | Posting custom_json | Canonical v1 commit-reveal op; not the current main pack UX. |
| `pack_reveal` | same player as commit | Posting custom_json | Canonical v1 commit-reveal op; not the current main pack UX. |
| `forge_commit` | player | Posting custom_json in code | Live from Collection. Debits Eitr in replay. |
| `forge_reveal` | same player as commit | Posting custom_json in code | Live delayed reveal; auto-finalize handles missed reveal. |
| `duat_airdrop_claim` | player | Posting custom_json | Pack claim path. Explicit Claim Packs action invokes Keychain. Snapshot entitlement is resolved by provider, not trusted payload counts. |
| `market_list` | NFT owner | Posting custom_json | Live method. Lists card/pack if owner. |
| `market_unlist` | listing owner | Posting custom_json | Live method. |
| `market_offer` | buyer | Posting custom_json | Live method. |
| `market_reject` | NFT owner | Posting custom_json | Live method. |
| `slash_evidence` | any account | Custom_json, permissionless in replay; client uses Posting path | Auto-broadcast from P2P handlers is disabled. Evidence is deferred until a visible Submit evidence action exists. Handler is still effectively minimal/ignored in shared apply. |

## Client Active/Custody Operations

These require higher authority because they transfer funds, transfer custody,
destroy an NFT, or mutate admin supply.

| Operation | Current signer | Hive key | Runtime status |
|---|---:|---|---|
| `card_transfer` | NFT owner | Active custom_json | Live through bridge/send/trade. |
| `burn` | NFT owner | Active custom_json | Live from Collection disenchant/burn flow. |
| `pack_purchase` | buyer | Active `requestBroadcast`: HBD transfer + custom_json | Live. Replay validates companion payment. |
| `pack_mint` | admin + operator | Active multisig transaction | Admin panel uses `/api/admin/multisig/*`; Hive requires both signatures. |
| `pack_distribute` | admin + operator | Active multisig transaction: transfer + custom_json | Admin panel adds the atomic companion transfer before server co-sign. |
| `pack_transfer` | admin + operator | Active multisig transaction: transfer + custom_json | Admin-only in replay. |
| `pack_burn` | pack owner | Active custom_json | Live from DUAT pack ceremony / bridge. Each burn now requires an explicit Open pack action. |
| `card_replicate` | card owner | Active custom_json in code | Method exists. |
| `card_merge` | card owner | Active custom_json in code | Method exists. |
| `market_buy` | buyer | Active custom_json in code | Method exists; replay checks companion payment. |
| `market_accept` | NFT owner | Active custom_json in code | Method exists; replay checks companion payment from offer buyer. |
| `duat_airdrop_finalize` | admin + operator | Active multisig transaction | Admin-only after claim window. |
| `genesis` | admin + operator | Active multisig transaction | Admin genesis ceremony path. |
| `seal` | admin + operator | Active multisig transaction | Admin genesis ceremony path. |
| `mint_batch` | admin + operator | Active multisig transaction | Admin pre-seal mint path. |

## Server-Side Hive Responsibilities

| Responsibility | Server signs? | Broadcasts to Hive? | Authority boundary |
|---|---:|---:|---|
| Chain indexer | No | No | Reads irreversible Ragnarok ops and applies shared protocol core into cache/read APIs for gameplay, economy, packs, and ranking. It does not own NFTLox custody. |
| `/api/chain/*` reads | No | No | Convenience projections only. Reads are not authority. |
| Matchmaking REST auth | No | No | Verifies a client Posting message signature when a username is supplied. |
| Tournament/treasury REST auth | No | No | Verifies signed headers, then mutates server-side coordination state. |
| Pending match envelope witness | Yes, with configured server Posting key | No | Signs deposit timestamp/hash for an opaque envelope. It is not a game-state decision. |
| Treasury multisig | Server collects signer sigs | Yes, after threshold | Broadcasts already-signed Hive transactions such as treasury HBD transfers. This is treasury ops, not gameplay replay authority. |
| RUNE exchange fulfillment | No | No | During replay, adapter materializes sealed packs from the already-broadcast `rune_exchange` op. |

## NFTLox Custom JSON Surface

Ragnarok also has client helpers for the external NFTLox protocol id. These are
not Ragnarok replay ops, but they are still Hive `custom_json` broadcasts and
they matter because NFTLox is the custody layer for genesis NFTs.

| NFTLox operation family | Current signer | Hive key in client helper | Notes |
|---|---:|---|---|
| `create_collection`, `mint`, `pack_create`, `pack_open`, `bulk_distribute`, `set_owner_data`, `extend_schema`, `replicate` | caller/admin/operator depending on flow | Posting by default | Present in `HiveSync.broadcastNFTLoxJson`. These should stay outside Ragnarok replay authority. |
| `list`, `transfer`, `burn`, `nft_lend`, `nft_return`, `data_operator_approve`, `buy` | owner/operator/buyer depending on flow | Active in client helper | Custody or payment-sensitive NFTLox operations. |

Admin automation should use protocol-specific adapters, not raw `HiveSync`
calls from UI surfaces:

- `ragnarokAdminAdapter` prepares Ragnarok replay ops through
  `/api/admin/multisig/prepare`, signs the returned transaction with Keychain
  Active authority, then submits it to `/api/admin/multisig/broadcast`.
- `nftLoxAdminAdapter` broadcasts NFTLox birth/custody ops through the same
  route with `protocol: "nftlox"`.
- Panel login is off-chain: the frontend admin account signs a custom_json-shaped
  login payload with Posting authority. The server verifies the signature and
  does not broadcast the payload.
- Admin broadcasts are on-chain native multisig: the prepared transaction uses
  `required_auths: [admin, operator]`. The frontend admin signs the exact Hive
  transaction with Active authority; the server verifies that signature, adds
  the operator Active signature from `RAGNAROK_ADMIN_OPERATOR_ACTIVE_KEY`, and
  broadcasts.

## Remaining Ambiguities

1. `RAGNAROK_PROTOCOL_V1.md` still describes an 18/19-op v1 surface, while `CANONICAL_ACTIONS` now has the extended v1.1/v1.2 set: pack NFTs, lineage, marketplace, and DUAT operations.
2. Future P2P `session_authorize`, winner `match_result` review (ADR 0008; no loser countersign), `slash_evidence`, on-chain matchmaking queue ops, Collection custody/crafting, Marketplace, Admin, Treasury, and the Hive transaction outbox UI still need full migration through the client wallet invocation seam before public beta.

## Decision Targets

Before hardening or publishing this as the canonical diagram, resolve these
choices explicitly:

1. Should the protocol doc be updated to the full current op set, or should
   some v1.1/v1.2 operations remain experimental and hidden from the launch
   authority matrix?
2. When ranked settlement is scheduled in a later phase, which wallet prompts
   should be explicit pre-match actions, which belong in visible result review,
   and which should use the visible wallet outbox?
