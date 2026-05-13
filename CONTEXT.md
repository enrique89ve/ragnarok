# Ragnarok Beta Testnet

This context defines the release language for taking Ragnarok from internal development into a closed, resettable community test.

## Language

**Testnet**:
A resettable shared environment used to validate gameplay, P2P, NFT, rewards, replay, and economy flows without permanent value.
_Avoid_: Production, mainnet, permanent economy

**Closed Testnet Beta**:
The next release milestone where a limited group of testers validates the full playable flow before public access.
_Avoid_: Public beta, mainnet launch, finished testnet

**Public Testnet Beta**:
A later release milestone where the broader community can play under published limits, monitoring, and reset rules.
_Avoid_: Mainnet launch, production season

**Playable Beta Flow**:
The complete tester-facing loop of local play, P2P play, turns, combat, victory, packs, rewards, and critical bug handling.
_Avoid_: Full catalog audit, every card validated, final balance

## Relationships

- A **Closed Testnet Beta** runs inside **Testnet**.
- A **Public Testnet Beta** follows a successful **Closed Testnet Beta**.
- **Testnet** state is reset before mainnet and does not create permanent ownership or rewards.
- The **Playable Beta Flow** must be stable before **Closed Testnet Beta** opens.

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

## State Authority

**NFT Custody**:
The external NFTLox layer that owns genesis NFT birth, ownership, distribution, transfer, burn, deterministic NFT ids, and instance DNA.
_Avoid_: PostgreSQL ownership, Ragnarok-only custody, inventory rows as NFT truth

**Ragnarok Replay State**:
State derived from irreversible Ragnarok Hive ops through `protocol-core`, including ranking, RUNE, Eitr, campaign progress, pack RNG resolution, and instance XP/level.
_Avoid_: Client-authored balances, database-authored ranking, NFTLox-authored gameplay state

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
An untrusted deck-submission assertion that a player intends to use a card under one explicit authority: `starter-entitlement` for universal starter cards by card-id, or `nft-custody` for genesis NFT instances by NFT uid. A claim is not gameplay truth until the **Deck Verification Protocol** resolves it into a verified card. For NFT claims, the card-id is derived from the NFT instance; any submitted card-id is only display/hint data and must not be trusted as authority.
_Avoid_: treating `cardId` as proof of genesis ownership, optional `nft_id` refs with implicit meaning, mixing starter entitlement and NFT custody in the same branch

**Verified Deck Card**:
A slot-preserving card fact produced by the **Deck Verification Protocol** from a **Deck Card Claim**. It is safe for match packaging, replay, XP, and anti-cheat to consume because the authority branch has already been resolved. A verified starter card carries only starter card-id and non-transferable/no-CardXP facts. A verified NFT card carries concrete NFT uid plus replay-derived instance data.
_Avoid_: deduplicating a deck into collection entries, awarding NFT XP from `cardId` alone, using verified deck cards before runtime boundary validation

**Protocol Authority**:
The explicit authority named by a protocol claim, currently `starter-entitlement` or `nft-custody`. It is not the same as the legacy local `CardOwnershipSource` string (`starter` or `nft`); adapters may map between them, but protocol validation should keep the authority vocabulary intact.
_Avoid_: silently aliasing protocol authority to UI/source labels, replacing legacy local source strings in one broad migration, using optional fields to infer authority

**Anti-Cheat Protocol**:
The shared verification rules and evidence format for ranked play: identity binding, deck eligibility, seed commit-reveal, command schemas, state hashes, dual signatures, transcript roots, replay validation, and slash evidence. It is not a live server referee; the server may relay, index, snapshot, and arbitrate under dispute, but the rules must be reproducible by clients and third parties.
_Avoid_: always-on server simulation, opaque moderator decisions, unverifiable ranked results, accepting single-signed ranked outcomes

**Server-Light Verification**:
The operating philosophy that expensive or authority-sensitive checks should be client-verifiable and replayable first, with the server acting as an availability and projection layer unless an operator write is unavoidable.
_Avoid_: server as hidden truth, per-request heavyweight recomputation, gameplay correctness depending on private server state

## Authority Relationships

- **Starter Ownership** is a rule from **Starter Entitlement Source of Truth**, not **NFT Custody** or **Operational Projection**.
- **NFT Custody** decides who owns a genesis NFT instance; **Ragnarok Replay State** decides what that instance has earned in gameplay.
- **NFTLox Progress Mirror** may be repaired from **Ragnarok Replay State** whenever they drift.
- **Operational Projection** must never be the only place a sensitive balance, ranking, ownership, or pack distribution decision exists.
- **Player Collection Protocol** is the seam every UI, deck verification, and match packaging flow uses when it needs playable ownership.
- **Deck Card Claim** is untrusted until resolved into a **Verified Deck Card** by the **Deck Verification Protocol**.
- **Anti-Cheat Protocol** decides whether ranked evidence is acceptable; **Operational Projection** may only cache or summarize its result.

## Campaign Protocol

- Campaign completion is declared with Hive `custom_json` id `rp_campaign_result`.
- The Hive broadcaster is the authoritative player identity; payload usernames are ignored.
- Local starts are stored as IndexedDB `campaign_runs`; `localRunId` and `localStartedAt` bind a result to a local draft but are not proof of start.
- `campaignSubmissions` is only a verifier inbox for accepted result envelopes.
- `campaignProgress` is the only final campaign state and the only state that unlocks campaign rewards.
- Testnet persistence can use local JSON or IndexedDB adapters; the protocol must stay rebuildable from chain history.

## Chain And RUNE Read Surface

- Hive L1 is the canonical source. Browser replay and the server indexer both derive state from irreversible chain ops through shared `protocol-core`.
- The server indexer is a convenience reader, not a trust boundary. It scans irreversible blocks with `get_ops_in_block` plus a LIB cursor, and starts by default unless `ENABLE_CHAIN_INDEXER=false`.
- Public read-only chain endpoints live under `/api/chain`.
- RUNE account balance is `GET /api/chain/player/:username/rune?seasonId=S01`.
- Global RUNE reads are `GET /api/chain/rune/state`, `GET /api/chain/rune/ledger`, and `GET /api/chain/rune/balances`.
- Testnet is a runtime profile, not a separate API namespace.
_Avoid_: `/api/testnet/rune/*`, duplicate RUNE read sources, client-authored RUNE amounts, treating the server indexer as canonical authority, high-frequency polling of RUNE reads

## Example Dialogue

> **Dev:** "Are we trying to finish the whole testnet before inviting players?"
> **Domain expert:** "No — the immediate goal is the **Closed Testnet Beta**: full playable logic, attractive UI, core chain/reward checks, and enough observability to handle real tester bugs."

> **Dev:** "Does full logic mean validating every card in the catalog?"
> **Domain expert:** "No — it means the **Playable Beta Flow** works end-to-end. Exhaustive card validation is work for beta feedback and targeted fixes."

## Flagged Ambiguities

- "testnet" was used to mean both the resettable environment and the next release milestone. Resolved: the environment is **Testnet**; the next milestone is **Closed Testnet Beta**.
- "all logic" was used broadly. Resolved: for **Closed Testnet Beta**, it means the **Playable Beta Flow**, not exhaustive validation of every card.
