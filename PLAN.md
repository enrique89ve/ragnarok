# Current Plan: Protocol Authority + Server-Light Verification

This plan supersedes the narrow Chain Indexer + RUNE Read API plan. The current
goal is to make ownership, deck eligibility, progression, ranking, and
anti-cheat rules live behind shared protocol modules instead of scattered UI,
server, or database assumptions.

## Principles

- The server should operate as little as possible. It relays, indexes, caches,
  snapshots, rate-limits, and performs unavoidable operator writes.
- Gameplay truth must be client-verifiable and replayable from public evidence.
- PostgreSQL, JSON state, IndexedDB, and REST snapshots are Operational
  Projections, not authority.
- Starter Ownership comes only from `STARTER_ENTITLEMENT`.
- Genesis NFT custody comes from NFTLox.
- ELO, RUNE, campaign progress, pack RNG resolution, and instance XP/level come
  from Ragnarok Replay State.
- NFTLox `mutableData.xp/level` is a Progress Mirror and can be repaired from
  replay.
- Anti-cheat is protocol evidence, not an always-on live server referee.

## Target Protocol Modules

### Player Collection Protocol

Interface goal: one typed collection view that answers what an account can play
with.

Inputs:

- Starter Entitlement Source of Truth.
- NFT Custody adapter, currently local/mock and later NFTLox.
- Ragnarok Replay State for instance progress.

Output shape:

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };
type CardId = Brand<number, 'CardId'>;
type StarterCardId = Brand<CardId, 'StarterCardId'>;
type NftUid = Brand<string, 'NftUid'>;
type DeckSlotIndex = Brand<number, 'DeckSlotIndex'>;

type PlayerCollectionEntry =
  | {
      authority: 'starter-entitlement';
      cardId: StarterCardId;
      ownedCopies: number;
      transferable: false;
      earnsCardXp: false;
    }
  | {
      authority: 'nft-custody';
      nftUid: NftUid;
      cardId: CardId;
      xp: number;
      level: number;
      transferable: true;
      earnsCardXp: true;
    };
```

Acceptance criteria:

- A new account with no DB inventory and no NFTs owns all starter cards.
- Starter entries never carry `nftUid`, transferable custody, CardXP, or NFT
  level.
- NFT entries always carry a concrete `nftUid`.
- The same rules are usable by browser replay and server read endpoints.

### Deck Verification Protocol

Interface goal: verify submitted Deck Card Claims against a Player Collection
view, then return resolved Verified Deck Cards. Claims are untrusted input;
verified cards are protocol facts that downstream match packaging, replay, XP,
and anti-cheat may consume.

Input claim shape:

```ts
type DeckCardClaim =
  | { authority: 'starter-entitlement'; cardId: StarterCardId }
  | { authority: 'nft-custody'; nftUid: NftUid };

type VerifiedDeckCard =
  | {
      slotIndex: DeckSlotIndex;
      authority: 'starter-entitlement';
      cardId: StarterCardId;
      transferable: false;
      earnsCardXp: false;
    }
  | {
      slotIndex: DeckSlotIndex;
      authority: 'nft-custody';
      nftUid: NftUid;
      cardId: CardId;
      xp: number;
      level: number;
      transferable: true;
      earnsCardXp: true;
    };
```

Rules:

- `VerifiedDeckCard[]` is slot-preserving. It represents the submitted deck's
  cards after verification, not a deduplicated collection view.
- Starter claims prove eligibility by intensional rule:
  `STARTER_ENTITLEMENT.copiesPerCardId[cardId]`.
- NFT claims prove eligibility by resolving `nftUid` through NFT Custody plus
  Ragnarok Replay State. `cardId` is derived from the resolved NFT instance,
  not trusted from the claim.
- Legacy/card-display payloads may carry `cardId` beside `nftUid`, but that
  field is only a UI hint. If present and inconsistent with the resolved NFT
  instance, verification rejects with a stable reason code.
- Stable rejection code candidates: `invalid-starter`, `copy-limit-exceeded`,
  `unknown-nft`, `not-owner`, `duplicate-nft-uid`, `hint-card-id-mismatch`.

Acceptance criteria:

- Starter decks verify without database rows.
- Genesis cards verify by `nftUid`, not only `cardId`.
- Duplicate-copy checks use source-aware counts.
- Client P2P verification and `/api/chain/verify-deck` share the same rules.
- Invalid deck refs produce stable rejection codes for anti-cheat evidence.

Migration notes:

- Keep existing `CardOwnershipSource = 'starter' | 'nft'` as a local asset/source
  vocabulary during migration. Map protocol authority to it at adapters:
  `starter-entitlement -> starter`, `nft-custody -> nft`.
- Keep legacy `CardRef`/`CardUidMapping` wrappers until browser deck building,
  P2P `deck_verify`, and match result packaging consume `DeckCardClaim` and
  `VerifiedDeckCard` directly.
- Introduce a v2 P2P deck verification payload that sends `DeckCardClaim[]`.
  The current `nftIds`-only message cannot prove starter cards or preserve deck
  slot intent.
- Treat compact `match_result.c` as legacy because it carries only card ids.
  Instance progression requires a uid-bearing result payload derived from
  verified NFT deck slots.

### Anti-Cheat Protocol

Interface goal: define evidence and rejection rules for ranked play without
turning the server into a live referee.

Checks:

- Hive identity binding during handshake.
- Engine/WASM hash comparison.
- Seed commit-reveal.
- Source-aware deck eligibility.
- Per-command schemas and authority model.
- Required previous-state hashes.
- Periodic state hash checks.
- Ranked dual signature with no single-signature fallback.
- Transcript Merkle root and optional transcript CID.
- Permissionless slash evidence.

Acceptance criteria:

- Ranked result broadcast is rejected unless both players sign the same result.
- A disputed or unresolved match is excluded from Season Score.
- State/hash/deck failures are classifiable with stable reason codes.
- Server arbitration can be lazy: run only for dispute, prize, ranking snapshot,
  or audit.

### Instance Progression Protocol

Interface goal: derive XP and level by NFT instance.

Acceptance criteria:

- Ranked match payloads identify winner NFT cards by `nftUid`.
- `applyWinnerCardXp` updates only the exact winning NFT instances.
- Starter cards do not earn CardXP or emit NFT level progression.
- NFTLox Progress Mirror writer consumes replay-derived instance progress only.

### Season Score Protocol

Interface goal: rank S01 from replay-derived final ELO plus capped RUNE bonus.

Acceptance criteria:

- Leaderboard sorts by `seasonScore`, then final ELO, wins, win rate, and
  documented tie-breakers.
- Eligibility enforces minimum ranked matches and campaign RUNE requirements.
- Final snapshot is reproducible from Ragnarok Hive replay.
- Server endpoints may cache the result but must not be ranking authority.

## Vertical Slices

1. Build Player Collection Protocol types and pure helpers in `shared/`.
2. Route server deck verification through Player Collection Protocol.
3. Route client P2P deck verification through the same deck verifier.
4. Update ranked match packaging to send source-aware deck/card refs.
5. Change replay XP from `cardId` matching to exact `nftUid` matching.
6. Add NFTLox Progress Mirror writer interface with local no-op adapter first.
7. Change leaderboard read model to Season Score.
8. Mark `/api/inventory` and DB-backed `/api/packs/open` as legacy/dev-only or
   route them through protocol projections.
9. Gate sensitive pack distribution through Ragnarok entitlement plus NFTLox
   custody/distribution.

## First Slice

Start with Player Collection Protocol plus Deck Verification Protocol.

Why first:

- It fixes the most sensitive authority gap with the smallest blast radius.
- It proves starter ownership does not depend on DB rows or claim state.
- It creates the seam needed by XP, P2P anti-cheat, collection UI, and packs.

First tests:

- New account, no inventory, verifies a valid starter deck.
- New account cannot verify an unowned genesis NFT card.
- A deck with two copies respects `STARTER_ENTITLEMENT.copiesPerCardId`.
- A genesis duplicate requires two distinct owned `nftUid`s.
- Server and browser verifier produce the same decision for the same input.

## Existing Read Surface To Preserve

- `GET /api/chain/player/:username/rune?seasonId=S01`
- `GET /api/chain/rune/state?seasonId=S01`
- `GET /api/chain/rune/ledger?seasonId=S01&account=:username`
- `GET /api/chain/rune/balances?seasonId=S01`

Do not reintroduce `/api/testnet/rune/*`. Testnet is a runtime profile, not a
second API namespace.

## Operating Limits

- Global `/api`: 120 requests/minute per IP.
- Sync-on-demand chain account reads: 24 requests/minute per IP in production.
- RUNE state/ledger/balances reads: 60 requests/minute per IP in production.
- UI background refresh for RUNE views should not run faster than once every 30
  seconds per browser view.
