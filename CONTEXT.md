# Ragnarok Beta Testnet

This context defines the release language for taking Ragnarok from internal development into a closed, resettable community test.

## Language

**Testnet**:
A resettable shared environment used to validate gameplay, P2P, NFT, rewards, replay, and economy flows without permanent value.
_Avoid_: Production, mainnet, permanent economy

**Gameplay-only P2P Testnet**:
The current P2P slice: both browsers run chess and poker, and the WebSocket
relay compares opaque deterministic roots only at phase changes. The match
shows a local terminal result but does not sign or broadcast `match_anchor` or
`match_result`, open Keychain after matchmaking, or mutate P2P RUNE, ELO,
Season Score, CardXP, NFTLox progress, or ownership.
_Avoid_: Ranked settlement, official winner, on-chain result, server gameplay judge

**QA Testnet Season 0**:
A resettable Testnet rehearsal that uses a separate Hive protocol id, fresh index start, and real replay-derived RUNE while deliberately granting testers full-catalog gameplay access for mechanics coverage. Its card access is a QA entitlement, not ownership, and it must not validate NFT custody, scarcity, marketplace value, or official ranking.
_Avoid_: Local sandbox, mainnet season, NFT ownership test, public beta

**Testnet Reset Epoch**:
The explicit identity of a resettable test phase. It binds the Hive protocol id, index start boundary, season start, collection id, and browser/server projection namespace into one reset contract so old local projections cannot bleed into a new QA or beta phase.
_Avoid_: Hardcoded cache buckets, manual browser cleanup, reusing local projections across reset phases

**QA Local Reward Feedback**:
The reset-epoch-scoped UX calculation shown after QA full-catalog P2P results so testers can validate victory rewards before winner-arbiter settlement. It may calculate and display projected winner RUNE from the current testnet season constants and local/profile XP from the P2P reward channel. If retained after display, it may live only in browser/profile QA state. It must not create a RUNE ledger entry, update `/api/chain/*`, update CardXP/`level_up`/NFTLox `mutableData`, affect Season Score, or become marketplace/ownership evidence.
_Avoid_: Local wallet credit, NFT XP, NFTLox data mutation, ranked settlement, mainnet reward history

**XP Economy Protocol**:
The static, adapter-ready math for Match XP and instance CardXP. Rates and projections live in `shared/protocol-core/xpEconomy.ts`. Replay and local preview must call those functions. A later Hive adapter persists `InstanceXpProjection` through `match_result` / `level_up`; the protocol module itself does not broadcast or write NFTLox.
CardXP belongs to the genesis NFT `uid`, not to the player account and not to `cardId`. A `card_transfer` or marketplace sale changes `owner` only; `xp` and `level` stay on the instance. Burn destroys the uid and that XP with it. A new forge/pack mint starts at `xp: 0`. Derived level is capped at `MAX_CARD_LEVEL` (3); the XP counter may keep growing past the last threshold. The 1→2 step is 5 ranked wins; the 2→3 step is four times that, so Divine is the long grind.
_Avoid_: Magic XP numbers in UI, client-only gain formulas, paying CardXP to starter or QA authorities, resetting XP on sale, treating CardXP as account-bound like RUNE

**Testnet Local Reward Feedback**:
The Alfa/closed-beta game-over display of the battle-end projection so the winner can see Match XP and projected RUNE without Hive. CardXP stays `0` until instance uids persist through `match_result`. It must not write Hive, `/api/chain/*`, `level_up`, NFTLox `mutableData`, or Season Score, and must not be treated as ranked settlement.
_Avoid_: Crediting RUNE on Alfa, writing CardXP, calling the modal an official wallet credit

**Closed Testnet Beta**:
The next release milestone where a limited group of testers validates the full playable flow before public access.
_Avoid_: Public beta, mainnet launch, finished testnet

**Public Testnet Beta**:
A later release milestone where the broader community can play under published limits, monitoring, and reset rules.
_Avoid_: Mainnet launch, production season

**Playable Beta Flow**:
The complete tester-facing loop of local play, P2P play, turns, combat, victory, packs, rewards, and critical bug handling.
_Avoid_: Full catalog audit, every card validated, final balance

**Alfa Player-Ready**:
The current finish line for shipping Ragnarok to more internal hands. It is true only when two browsers complete the Chess-Poker P2P Spine, the poker board is readable without external explanation, Hive Keychain is used only for pre-match login, and the deployed Alfa runtime proves health/admin/P2P readiness. It is not Closed Testnet Beta, Public Testnet Beta, or mainnet.
_Avoid_: Finished game, ranked launch, settlement complete, every OPEN in the wire spec closed

**Chess-Poker P2P Spine**:
The only P2P gameplay path that must stay fluid: `chess → poker_combat → chess → game_over`, with optional instant-kill captures that never leave chess. Both peers apply chess and poker locally from shared seed and intent envelopes. The relay compares opaque **Phase Checkpoint** roots only at those phase changes.
_Avoid_: Server simulating chess or poker, host-authored poker state, skipping checkpoints, treating cards-phase host sync as the P2P match spine

**Phase Checkpoint**:
A fixed-size agreement at a legal phase boundary. Each peer submits `phase_checkpoint_propose_v1` with a 32-byte `stateRoot`; the relay emits commit if both roots match or dispute/freeze if they differ. Allowed transitions are only `chess ↔ poker_combat` and `* → game_over`. A commit proves peer agreement, not objective legality.
_Avoid_: Server gameplay judge, winner selection on mismatch, checkpointing `vs_screen`, treating a commit as Hive settlement evidence

**Instant Kill Capture**:
A chess capture that stays on the chess board. It is instant when the attacker is pawn or king, or the defender is a pawn. The wire type is `chess_attack`. Both peers apply the kill locally; poker does not start.
_Avoid_: Opening poker for pawn/king weapon captures, routing this as `chess_combat_initiated`

**Poker Combat Capture**:
A non-instant chess capture that stages `pendingCombat` and, after the attack animation, boots deterministic poker. The wire type is `chess_combat_initiated`. Poker participant ids are the chess piece ids. Deck and combat ids derive from `matchSeed`, piece ids, positions, and chess move count. Viewer slots may swap; attacker/defender roles stay canonical.
_Avoid_: Host sending a poker snapshot as bootstrap, `Math.random()` for deal or showdown, treating viewer `player`/`opponent` slots as canonical sides

**Chess Transition Receipt**:
A post-apply chess integrity receipt (`transition_receipt_v1`) that binds command intent to the receiver's pre/post chess+cards roots. A rejection or root mismatch quarantines further local chess actions. It is a partial root (`scope: 'chess+cards'`), not the **Phase Checkpoint** and not a full-match commitment.
_Avoid_: Using the receipt as poker or `game_over` authority, recovering from mismatch by trusting one peer's snapshot as truth

## Relationships

- A **Closed Testnet Beta** runs inside **Testnet**.
- **Gameplay-only P2P Testnet** is the active P2P validation slice and follows
  [`ADR 0007`](docs/adr/0007-p2p-gameplay-only-testnet.md); ranked settlement is
  a later slice.
- **QA Testnet Season 0** may run before **Closed Testnet Beta** to stress gameplay with full-catalog access while still using resettable Hive replay and RUNE.
- Every resettable QA or beta phase must declare a **Testnet Reset Epoch** before testers start.
- A **Public Testnet Beta** follows a successful **Closed Testnet Beta**.
- **Testnet** state is reset before mainnet and does not create permanent ownership or rewards.
- **QA Testnet Season 0** does not prove NFT custody or player ownership because its card access is intentionally broader than **NFT Custody**.
- Client-local replay, tester progress, and operational projections must be isolated by **Testnet Reset Epoch** rather than cleaned manually between phases.
- **QA Local Reward Feedback** may run only inside the QA full-catalog reset epoch. It is UX rehearsal for reward math, not **RUNE Ledger Protocol**, **NFTLox Progress Mirror**, or official ranking.
- **Testnet Local Reward Feedback** may run on resettable non-economic testnet P2P (Alfa or Closed Testnet Beta) so the winner sees Match XP and projected RUNE in the game-over modal. It is display-only and not a ledger credit.
- **XP Economy Protocol** is the only place Match XP and CardXP rates are defined. Preview adapters calculate; Hive adapters persist later.
- Campaign and P2P battle-end fire Match XP and RUNE together via `projectBattleEndRewards`. The channels stay independent; practice pays neither.
- Any QA local reward cache must be keyed by stage, protocol id, reset epoch, account, and match id, and must be ignored or purged on stage/epoch/account change so QA feedback cannot leak into Closed Testnet Beta, NFTLox custody, or mainnet.
- The **Playable Beta Flow** must be stable before **Closed Testnet Beta** opens.
- **Alfa Player-Ready** is the shortest definition of "the game is finished enough to play." Ranked settlement, NFTLoX custody proof, and Closed Testnet Beta come after that spine is proven.
- The **Chess-Poker P2P Spine** is the playable core of **Gameplay-only P2P Testnet**.
- **Instant Kill Capture** never enters poker. **Poker Combat Capture** always enters poker through `pendingCombat` and a **Phase Checkpoint** on `chess → poker_combat`.
- Poker resolution writes HP/stamina back onto the same chess pieces, then a **Phase Checkpoint** on `poker_combat → chess` must commit before chess inputs resume.
- `game_over` is legal from chess or poker only after the terminal **Phase Checkpoint**. The displayed winner is local test evidence, not **Anti-Cheat Protocol** settlement.
- **Chess Transition Receipt** detects mid-chess divergence. **Phase Checkpoint** detects divergence at ruleset changes. Neither replaces later ranked dual-sig.

## Starter Entitlement

**Starter Ownership**:
A universal, account-bound right to the 45 canonical starter card-ids. Every Hive account owns these from day one — there is no acquisition event that grants ownership. Ownership is intensional (a rule, not a row in any collection) and enforced uniformly at every layer that asks "does this account own this cardId?".
_Avoid_: Claim-gated ownership, materializing starter as rows, "after claim the player owns…"

**Starter Entitlement Source of Truth**:
The single canonical declaration of starter cards lives in `shared/schemas/starterEntitlement.ts` as the eager-precomputed `STARTER_ENTITLEMENT` constant. It exposes (a) the card-ids per class, (b) the 4 pre-built hero decks of 30 cards each, (c) per-cardId copy counts. Every consumer (bridge ownership lookup, claim ceremony, hero-deck seed, chain validation) reads from this constant — no duplicates, no constants scattered across modules.
_Avoid_: Recomputing starter card lists, hardcoding copies counts in bridges, duplicating the deck composition in client modules

**Starter Claim Ceremony**:
A one-time-per-account UX ritual that reveals the universal starter ownership to the player with animation and narrative. The ceremony does NOT grant ownership (already universal); it only records `claimedAt` so the ritual is not shown again, and triggers the seeding of 4 pre-built hero decks (queen=Mage, rook=Warrior, bishop=Priest, knight=Rogue) into the player's `useHeroDeckStore` for convenience. If the player skips the ceremony ("Maybe later"), the seed does NOT run; the player still owns all starter cards but must build decks manually. A persistent "Claim" CTA stays visible until the ceremony is accepted.
_Avoid_: Claim as ownership transfer, claim as data mutation, "the player claims their cards", auto-seeding decks without explicit player action

**DUAT Airdrop Ceremony**:
The tester-facing ritual where an eligible Hive account claims its DUAT-derived sealed packs, opens those packs, and can inspect the resulting cards as a distinct ceremony outcome. In **QA Testnet Season 0**, this ceremony must remain visible and filterable even when full-catalog QA access is enabled, so testers can give feedback on the DUAT flow without confusing QA access with ownership.
_Avoid_: Hiding DUAT results inside the full catalog, treating DUAT as an in-game balance, implying full-catalog access came from DUAT

## State Authority

**NFT Custody**:
The external NFTLox layer that owns genesis NFT birth, ownership, distribution, transfer, burn, deterministic NFT ids, and instance DNA.
_Avoid_: PostgreSQL ownership, Ragnarok-only custody, inventory rows as NFT truth

**Ragnarok Pack Fulfillment**:
The Ragnarok-owned flow that turns a pack trigger into concrete card instance distributions; NFTLox does not create, store, price, open, or randomize packs.
_Avoid_: NFTLox pack, NFTLox drop table, NFTLox pack opening, pack as NFTLox custody object

**Ragnarok Replay State**:
State derived from irreversible Ragnarok Hive ops through `protocol-core`, including ranking, RUNE, Eitr, campaign progress, pack RNG resolution, and instance XP/level.
_Avoid_: Client-authored balances, database-authored ranking, NFTLox-authored gameplay state

**RUNE Ledger Protocol**:
The bank-ledger-style protocol for RUNE. It accepts signed Hive events, derives the balance owner from protocol authority, computes amounts from season rules, writes append-only ledger entries, and treats scalar balances as replay projections.
_Avoid_: user-authored RUNE amounts, direct balance edits, server-authored balance truth, treating RUNE like a transferable smart-contract token

**RUNE Balance Owner**:
The Hive account whose RUNE balance is credited or debited by a ledger entry. For self-directed ops, the owner is the authenticated `op.broadcaster`; for ranked P2P, the owner is the winner or loser account proven by the dual-signed match envelope.
_Avoid_: trusting payload `account` fields, crediting a different account from a self-signed op, letting a client choose the balance owner

**NFTLox Progress Mirror**:
The NFTLox `mutableData` copy of replay-derived instance `xp`/`level`, written by a Ragnarok data operator for interoperability and backup.
_Avoid_: NFTLox as XP authority, owner-authored XP, resolving progress conflicts in favor of mutableData

**Operational Projection**:
A server or database cache that improves reads or workflows but can be rebuilt from **NFT Custody** and **Ragnarok Replay State**.
_Avoid_: Source of truth, canonical database, permanent inventory state

**Player Collection Protocol**:
The shared read protocol that answers "what can this account play with?" by combining **Starter Ownership**, **NFT Custody**, and **Ragnarok Replay State** into one typed collection view. It is client-verifiable and server-cacheable: the browser may build it from local replay/NFTLox cache, and the server may expose it as a convenience projection, but both must obey the same protocol rules.
_Avoid_: UI-only collection shape, server-only inventory endpoint, `user_inventory` as ownership truth, losing the `starter` vs `nft` discriminator

**Deck Card Claim**:
An untrusted deck-submission assertion that a player intends to use a card under one explicit authority: `starter-entitlement` for universal starter cards by card-id, `nft-custody` for genesis NFT instances by NFT uid plus card-id, or `qa_full_catalog` for reset-epoch-scoped QA gameplay access. A claim is not gameplay truth until the **Deck Verification Protocol** resolves it into a verified card. QA claims are never NFT custody, marketplace ownership, CardXP eligibility, or ranked economy proof.
_Avoid_: treating `cardId` as proof of genesis ownership, optional `nft_id` refs with implicit meaning, mixing starter entitlement and NFT custody in the same branch

**Verified Deck Card**:
A slot-preserving card fact produced by the **Deck Verification Protocol** from a **Deck Card Claim**. It is safe for match packaging, replay, XP, and anti-cheat to consume because the authority branch has already been resolved. A verified starter card carries only starter card-id and non-transferable/no-CardXP facts. A verified NFT card carries concrete NFT uid plus replay-derived instance data. A verified QA card carries only card-id, reset epoch, and gameplay-only/no-CardXP facts.
_Avoid_: deduplicating a deck into collection entries, awarding NFT XP from `cardId` alone, using verified deck cards before runtime boundary validation

**Protocol Authority**:
The explicit authority named by a protocol claim, currently `starter-entitlement`, `nft-custody`, or `qa_full_catalog`. It is not the same as the legacy local `CardOwnershipSource` string (`starter` or `nft`); adapters may map between them, but protocol validation should keep the authority vocabulary intact.
_Avoid_: silently aliasing protocol authority to UI/source labels, replacing legacy local source strings in one broad migration, using optional fields to infer authority

**Anti-Cheat Protocol**:
The shared verification rules and evidence format for ranked play: identity binding, deck eligibility, seed commit-reveal, command schemas, state hashes, dual signatures, transcript roots, replay validation, and slash evidence. It is not a live server referee; the server may relay, index, snapshot, and arbitrate under dispute, but the rules must be reproducible by clients and third parties.
_Avoid_: always-on server simulation, opaque moderator decisions, unverifiable ranked results, accepting single-signed ranked outcomes

**Server-Light Verification**:
The operating philosophy that expensive or authority-sensitive checks should be client-verifiable and replayable first, with the server acting as an availability and projection layer unless an operator write is unavoidable.
_Avoid_: server as hidden truth, per-request heavyweight recomputation, gameplay correctness depending on private server state

## Authority Relationships

- **Starter Ownership** is a rule from **Starter Entitlement Source of Truth**, not **NFT Custody** or **Operational Projection**.
- **Ragnarok Pack Fulfillment** decides pack contents before **NFT Custody** births or distributes the resulting card instances.
- **DUAT Airdrop Ceremony** is a claim/open/inspect UX over **Ragnarok Pack Fulfillment** and **NFT Custody**; it must expose the resulting cards as a filterable acquisition path even when **QA Testnet Season 0** grants broader full-catalog access.
- **NFT Custody** decides who owns a genesis NFT instance; **Ragnarok Replay State** decides what that instance has earned in gameplay.
- NFTLox **instance DNA** (`nftDna`) identifies one copy. The seed / `cardId` is the template. Two copies of the same `cardId` share the template and have different instance DNA. **XP Economy Protocol** CardXP is bound to that instance (`uid` today, `nftDna` when NFTLox custody is live), so a transfer moves the same DNA and the same XP. A new mint of the same `cardId` is a new DNA and starts at `xp: 0`.
- A ranked `match_result` may list many `cardId`s for display, but CardXP apply reads only winner instance uids (`u`). Copies of the same `cardId` that did not play receive `0`.
- **NFTLox Progress Mirror** may be repaired from **Ragnarok Replay State** whenever they drift.
- **Operational Projection** must never be the only place a sensitive balance, ranking, ownership, or pack distribution decision exists.
- **Player Collection Protocol** is the seam every UI, deck verification, and match packaging flow uses when it needs playable ownership.
- **Deck Card Claim** is untrusted until resolved into a **Verified Deck Card** by the **Deck Verification Protocol**.
- **Anti-Cheat Protocol** decides whether ranked evidence is acceptable; **Operational Projection** may only cache or summarize its result.
- **RUNE Ledger Protocol** owns RUNE balance authority; every ledger entry must name exactly one **RUNE Balance Owner**.
- **QA Local Reward Feedback** may display projected match/profile progress for QA cards, but verified QA cards still earn `0` CardXP and must never produce `level_up` or NFTLox `mutableData` writes.

## Campaign Protocol

- Campaign completion is declared with Hive `custom_json` id `rp_campaign_result`.
- The Hive broadcaster is the authoritative player identity; payload usernames are ignored.
- Local starts are stored as IndexedDB `campaign_runs`; `localRunId` and `localStartedAt` bind a result to a local draft but are not proof of start.
- `campaignSubmissions` is an inbox of accepted result envelopes, marked `consumed` after inline validation writes the corresponding progress record.
- `campaignProgress` is the only final campaign state. `applyCampaignResult` writes it inline after registry hash, mission, prerequisite, and nonce checks pass, and credits first-clear RUNE in the same apply step. Transcript-replay verification is reserved for Phase 2 / mainnet hardening (see ADR 0004).
- Testnet persistence can use local JSON or IndexedDB adapters; the protocol must stay rebuildable from chain history.

## Chain And RUNE Read Surface

- Hive L1 is the canonical source. Browser replay and the server indexer both derive state from irreversible chain ops through shared `protocol-core`.
- The server indexer is a convenience reader, not a trust boundary. It scans irreversible blocks with `get_ops_in_block` plus a LIB cursor, and starts by default unless `ENABLE_CHAIN_INDEXER=false`.
- Public read-only chain endpoints live under `/api/chain`.
- RUNE account balance is `GET /api/chain/player/:username/rune?seasonId=S01`.
- Global RUNE reads are `GET /api/chain/rune/state`, `GET /api/chain/rune/ledger`, and `GET /api/chain/rune/balances`.
- Testnet is a runtime profile, not a separate API namespace.
- **QA Local Reward Feedback** must not be exposed under `/api/chain/*`, merged into wallet balances, or used as an input to Season Score; those surfaces read only replay-derived RUNE.
_Avoid_: `/api/testnet/rune/*`, duplicate RUNE read sources, client-authored RUNE amounts, treating the server indexer as canonical authority, high-frequency polling of RUNE reads

## Example Dialogue

> **Dev:** "Are we trying to finish the whole testnet before inviting players?"
> **Domain expert:** "No — the immediate goal is the **Closed Testnet Beta**: full playable logic, attractive UI, core chain/reward checks, and enough observability to handle real tester bugs."

> **Dev:** "Does full logic mean validating every card in the catalog?"
> **Domain expert:** "No — it means the **Playable Beta Flow** works end-to-end. Exhaustive card validation is work for beta feedback and targeted fixes."

> **Dev:** "How do we finish Ragnarok as soon as possible?"
> **Domain expert:** "Finish now means **Alfa Player-Ready**. Prove the **Chess-Poker P2P Spine** in two browsers, make the poker board readable, keep Keychain off the match path, and ship the Alfa runtime. Do not block that on `match_result`, RUNE/ELO, NFTLoX custody, or closing every OPEN in the wire spec."

> **Dev:** "Does the server decide who won the chess-to-poker fight?"
> **Domain expert:** "No. Both browsers apply the same chess and poker intents. The relay only compares **Phase Checkpoint** roots. On mismatch it freezes; it never picks a winner."

## Flagged Ambiguities

- "testnet" was used to mean both the resettable environment and the next release milestone. Resolved: the environment is **Testnet**; the next milestone is **Closed Testnet Beta**.
- "all logic" was used broadly. Resolved: for **Closed Testnet Beta**, it means the **Playable Beta Flow**, not exhaustive validation of every card.
- "finish the game" was used to mean mainnet completeness. Resolved: the current finish line is **Alfa Player-Ready**; **Closed Testnet Beta** is the next milestone after that spine is proven.
