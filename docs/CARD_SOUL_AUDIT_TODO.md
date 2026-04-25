# Card Soul Audit — Backlog

> **Note:** Phases 1–9 of the original audit (lore renames, mechanic alignment, artifact rework, pet evolution, class identity, Greek gaps) are **complete and verified in code as of 2026-04-25**. The full historical record lives in `git log`. This document now tracks only what remains.

---

## ⚠️ Phase 10: NFT SDK Architecture — DESIGN ONLY (Not Implemented)

**Status:** Architectural proposal. No `sdk/` folder or `shared/contracts/` directory exists in the codebase. Previously marked as "✅ COMPLETED" — incorrect.

### Core Problem
Game code has 15+ direct imports from blockchain layer (`HiveDataLayer`, `HiveSync`, `HiveEvents`, `HiveTypes`). Changes to `HiveCardAsset` require updates in 9+ game files. Trade execution chains 7 components for a single operation.

### Architecture Principles
- **Screaming Architecture**: folders named by use case (ownership, trading, rewards), not technology
- **Zod contracts**: shared types validated at boundary, inferred via `z.infer<>`
- **Adapter pattern**: game depends on interfaces, never concrete Hive implementations
- **Source of truth per data type**: card definitions = game, ownership = chain, ELO = chain, deck builds = game, match state = game+chain (dual-signed)

### Key Interfaces to Extract

```typescript
interface IOwnershipValidator {
  getOwnedCopies(cardId: number): number;
  canAddCard(cardId: number, heroClass: string, deck: HeroDeck): boolean;
}

interface ICardTransferManager {
  transferCard(nftUid: string, toUser: string): Promise<Result>;
  transferMultiple(nftUids: string[], toUser: string): Promise<Result>;
}

interface IRewardClaimer {
  claimReward(rewardId: string, metadata: Record<string, unknown>): Promise<Result>;
}

interface IMatchResultBroadcaster {
  broadcastResult(result: MatchResult): Promise<Result>;
  signResultHash(hash: string): Promise<SignatureResult>;
}
```

### Target File Structure

```
sdk/
├── contracts/           # Zod schemas (source of truth for shared types)
│   ├── ownership.ts
│   ├── trading.ts
│   ├── rewards.ts
│   ├── matches.ts
│   └── identity.ts
├── adapters/
│   ├── hive/
│   │   ├── HiveOwnershipAdapter.ts
│   │   ├── HiveTransferAdapter.ts
│   │   ├── HiveRewardAdapter.ts
│   │   └── HiveMatchAdapter.ts
│   └── local/
│       ├── LocalOwnershipAdapter.ts
│       └── LocalTransferAdapter.ts
├── ports/               # Game-facing interfaces
│   ├── IOwnershipValidator.ts
│   ├── ICardTransferManager.ts
│   ├── IRewardClaimer.ts
│   └── IMatchResultBroadcaster.ts
└── index.ts
```

### Migration Path
1. Extract interfaces from current coupling points (15+ files)
2. Create Hive adapters that wrap existing `HiveSync` / `HiveDataLayer` / `HiveEvents`
3. Inject adapters at app initialization (replace direct imports)
4. Move Hive-specific code into `sdk/adapters/hive/`
5. Game code imports only from `sdk/ports/` and `sdk/contracts/`

### Risks
- Migration scope: 15+ game files need injection refactoring
- DTO conversion layer adds boilerplate
- `HiveEvents` + `GameEventBus` should merge into one event system
- Need mock adapters for testing (local mode already works as template)

---

## F1: Class Pet Synergy Cards (Backlog)

**Context:** Considered hard-locking 12 pet families to specific classes (1 per class, 26 remain neutral). After analysis, hard-locking was rejected:
- 30-card decks + 4-minion battlefield = only 1 class family (7 cards) gives zero choice
- 26 neutral families would still dwarf 1 class family, making the signal weak
- Trigger distribution is lopsided (16 families use `on_deal_damage`) — would create class imbalance
- Removes cross-class pet creativity (warrior running healer pets, etc.)

**Better approach:** Add 12 class-specific pet synergy cards (one per class) that reference a specific `petFamily`, giving a soft incentive without hard restriction.

### Proposed Class ↔ Family Pairings

| Class | Signature Pet Family | Synergy Theme |
|-------|---------------------|---------------|
| Warrior | Bears | Tanky beasts, berserker bear-warriors (Bödvar Bjarki) |
| Hunter | Wolves | Pack hunting, Fenrir lineage |
| Rogue | Ravens | Huginn/Muninn — stealth, intelligence |
| Mage | Drakes | Magical creatures, elemental breath |
| Paladin | Bifrost | Rainbow bridge guardians, divine shield |
| Shaman | Stormkin | Lightning, elemental forces |
| Priest | Fylgja | Spirit animals, Norse guardian spirits |
| Warlock | Hellhounds | Underworld fire, Garmr |
| Druid | Ents | Nature, Yggdrasil |
| Necromancer | Draugr | Undead, risen dead |
| DeathKnight | Giants | Niflheim cold, jotun lords |
| Berserker | Einherjar Warriors | Fallen warriors, Valhalla |

### Implementation Notes
- 12 new class cards (one per class, ~3 mana minions)
- Effects like *"Your [Family] pets evolve one trigger faster"* or *"When a [Family] pet evolves, draw a card"*
- All pet families stay `class: 'Neutral'` — the synergy is opt-in
- Keep 14 unpaired families as universal options
