# Card Soul Audit — Outstanding TODO

Generated from deep card audit (2026-03-14). All flavor text + IP renames completed. These are the deeper lore, mechanic, and identity fixes remaining.

---

## Phase 1: Lore-Inaccurate Mechanics ✅ COMPLETED

### 1.1 Helheim Realm Effect (30304) ✅
- Changed `return_to_hand_on_death` → `banish_on_death` (new realm effect type)
- Early return in `zoneUtils.ts` `destroyCard()` skips ALL death effects (deathrattle, reborn, einherjar, chain)
- Added `'banish_on_death'` to `RealmEffect.type` union in `types.ts`

### 1.2 Eitri the Unmaker → Eitri, Forge-Breaker (31922) ✅
### 1.3 Horn of Gjallarhorn → Gjallarhorn (31919) ✅
### 1.4 Norn's Bargain → Norn's Demand (30004) ✅
- Originally "Norn's Decree" but collided with prophecy 30101
### 1.5 Einherjar's Price → Valkyrie's Tithe (30007) ✅
### 1.6 Skoll/Hati Already Swapped ✅
### 1.7 Kara Kazham Tokens Already Renamed ✅ (Candle/Broom/Teapot → Spark Wisp/Straw Golem/Cauldron Imp)

---

## Phase 2: Soulless Card Renames ✅ COMPLETED

### 2.1 Norse Mechanic Payoff Renames ✅
- 31906: Wound-Drinker → Geirskögul, Spear-Shaker
- 31911: Doom-Reader → Gróa's Vision (ID was 31911 not 31909)
- 31908: Sanguine Rune → Blóðrún (ID was 31908 not 31910)
- 31914: Wanderer of the Nine → Veðrfölnir's Flight (ID was 31914 not 31913)

### 2.2 Ragnarok Herald → Heimdall's Warning (30102) ✅
### 2.3 Einherjar Named Warriors (30201-30206) ✅
- Hadding the Twice-Born, Hervor Shield-Maiden, Bödvar Bjarki, Helgi Hundingsbane, Sigmund the Völsung
### 2.4 Svartalfheim Titan → Svartalfheim Construct (1906) ✅
- Also changed race from Giant → Automaton

---

## Phase 3: Super Minion Mechanic-Lore Alignment ✅ COMPLETED

All 9 broken battlecries remapped to working handler types (were silently failing).

| ID | Old Name | New Name | Old Handler (broken) | New Handler (working) |
|----|----------|----------|---------------------|----------------------|
| 95045 | Tears of the Faithful | Sigyn's Vigil | `heal_grant_deathrattle` | `give_divine_shield` |
| 95037 | Breath of the Creator | Hoenir's Gift of Spirit | `grant_deathrattle_draw` | `buff` (+2/+2) |
| 95038 | Eros's Bow of Enchantment | Aphrodite's Cestus | `mind_control_conditional_buff` | `mind_control_random` |
| 95039 | Peacock Throne of Olympus | Hera's Jealous Claim | `silence_buff_discount` | `mind_control_random` |
| 95040 | Arrow of True Love | Eros's Golden Arrow | `mind_control_highest` | `freeze` |
| 95033 | Dawn's First Light | Skinfaxi's Mane | `buff_divine_shield_damage` | `give_divine_shield` |
| 95047 | Colossus of the Dark Forge | Blainn's Masterwork | `buff_self_summon_from_enemies` | `fill_board` |
| 95068 | Moonlit Palace | Tsukuyomi's Exile | `stealth_all_buff_draw` | `grant_stealth` |
| 95070 | Crossroads Guardian | Sarutahiko's Guidance | `loatheb_effect` | `discover` |

---

## Phase 4: Elder Titan Text Rework ✅ COMPLETED

### 4.1 File Rename ✅
- `oldGods.ts` → `elderTitans.ts`, `oldGodsCards` → `elderTitanCards`
- Updated all imports/exports in `neutrals/index.ts`

### 4.2-4.5 Support Card Renames + Titan Flavor Updates ✅
- 60002: Seidr Acolyte → Ember of Gullveig
- 60005: Gullveig's Ember-Keeper → Keeper of the Thrice-Flame
- 60008: Jotun Shieldbearer → Gullveig's Ash Guardian
- 60010: Thrall of Gullveig → Risen from the Pyre
- All 4 titans (Gullveig, Hyrrokkin, Utgarda-Loki, Fornjot) got Eddic-sourced flavor text
- Internal effect keys preserved (`cthun_damage`, `buff_cthun`, `yogg_saron`, `resurrect_deathrattle`)

---

## Phase 5: Generic Artifact Renames ✅ COMPLETED

### 5.1 Direct Renames (14 artifacts) ✅
All renamed to mythology-accurate names with updated descriptions and flavor text.
Lævateinn, The Aegis, Enyalios, Cap of Invisibility, Seidstafr, Delling's Shard,
The Mammen Axe, Gleipnir, Gnipahellir's Tooth, Máni's Thread, Veðrfölnir's Talon,
Naglfar's Keel, Gleipnir's Fang. Vault of Ouranos heroId skipped (no matching hero exists).

### 5.2 Master Bolt Category Fix ✅
- 29801: `norse_artifact` → `greek_artifact`

### 5.3 Megingjord — Kept as-is (Magni is Thor's son, intentional)

---

## Phase 6: Artifact Cost Diversity ✅ COMPLETED

### 6.1 Cost Redistribution ✅
- 35 artifacts re-costed from uniform 5 mana to 4-7 mana range
- 4 mana: ~4 simple stat-stick artifacts
- 5 mana: ~42 standard power level (majority kept here)
- 6 mana: ~21 named mythological weapons with strong effects
- 7 mana: ~10 game-warping artifacts (Gungnir, Mjolnir, etc.)

---

## Phase 7: Pet Evolution Variety ✅ COMPLETED

### 7.1 Diversify Evolution Triggers ✅
Reassigned 8 families from overused `on_deal_damage`/`on_survive_turn` to thematically fitting underused triggers:
- Wolves → `on_destroy`, Bears → `on_gain_health`, Drakes → `on_apply_burn`
- Hellhounds → `on_apply_burn`, Stormkin → `on_summon`, Giants → `on_reduce_attack`
- Draugr → `on_silence`, Dwarven Forgemasters → `on_return_to_hand`

### 7.2 Diversify Stage 3 Stats ✅
5 families now have extreme stat profiles:
- Wolves (Fenrir Reborn): 10/3 glass cannon
- Serpents (Jormungandr's Heir): 3/12 tanky wall
- Ents: 2/11 defensive wall
- Stormkin: 9/4 burst damage
- Draugr: 8/6 undead brute

### 7.3 Fix Stage 3 Description Repetition ✅
All 38 Stage 3 pets now have unique thematic descriptions instead of generic "The final form depends on its evolution path."

### 7.4 Fix Element Assignments ✅
- Bifrost: Sun Foal + Arvakr's Glow `electric` → `light` (with dark weakness)
- Einherjar Warriors: Fallen Recruit + Einherjar Berserker + Eternal `fire` → `light`
- Fylgja: Kept as-is (fire/water/dark already matches Ember/Tide/Shadow Spirit themes)

---

## Phase 8: Class Identity Fixes ✅ COMPLETED

### 8.1 Warlock Norse Identity ✅
5 "Void" cards renamed to Norse equivalents:
- Void Wanderer → Ginnungagap Wanderer (17001)
- Void Shade → Ginnungagap Shade (17007)
- Nether Void → Ginnungagap Abyss (17009)
- Void Pact → Hel's Covenant (17103)
- Void Covenant → Muspel Covenant (37002)

### 8.2 Priest Norse Identity — Deferred
Multi-mythology game; Greek priest cards (Selene, Persephone, Chronos) are valid. Norse priest cards already exist (Hel's Priestess, Hel's Whisper, Baldur refs). Adding new cards is a separate card-design task.

### 8.3 Hunter Renames ✅
5 generic animal names → mythology-specific:
- Stealthy Jaguar → Svartalfheim Stalker (7011)
- Pack Alpha → Fenrir's Packleader (7012)
- Timber Wolf Alpha → Garmr's Kin (7015)
- Savannah Guardian → Freya's Pride (7019)
- Fang Commander → Skadi's Huntmaster (7020)

### 8.4 Rogue Renames ✅
2 generic thief names → Norse-themed:
- Shady Dealer → Svartalfheim Trader (85001)
- Cutpurse → Loki's Pickpocket (85007)
Rogue card count trim deferred (41 cards, not excessive).

---

## Phase 9: Remaining Greek Card Gaps ✅ COMPLETED

### 9.1 New Greek Mythic Minions ✅
Added 7 cards (IDs 32207-32213): Hydra, Minotaur, Sphinx, Chimera, Scylla, Pegasus, The Furies.
All with lore-accurate mechanics (Hydra gains ATK on damage, Sphinx discovers, Furies summon copies, etc.)

### 9.2 Race Fixes ✅
- Typhon (32202): Elemental → Titan
- Porphyrion (32203): Elemental → Titan, rarity epic → mythic
- Medusa (32206): Added missing `race: 'Spirit'`

---

## Verification Checklist (Run After Each Phase)

1. `npx tsc --noEmit` — zero errors
2. `npm run build` — production build succeeds
3. Spot-check renamed cards appear correctly in deck builder
4. Verify no broken `effectHandler` references if battlecry keys changed
5. Search for old names in all files to catch stale references

---

## Phase 10: NFT SDK Architecture ✅ COMPLETED (Previous Session)

Completed in "NFT SDK Separation" session — see CLAUDE.md changelog for details.

### 10.1 Core Problem
Game code has 15+ direct imports from blockchain layer (`HiveDataLayer`, `HiveSync`, `HiveEvents`, `HiveTypes`). Changes to `HiveCardAsset` require updates in 9+ game files. Trade execution chains 7 components for a single operation.

### 10.2 Architecture Principles
- **Screaming Architecture**: folders named by use case (ownership, trading, rewards), not technology
- **Zod contracts**: shared types validated at boundary, inferred via `z.infer<>`
- **Adapter pattern**: game depends on interfaces, never concrete Hive implementations
- **Source of truth per data type**: card definitions = game, ownership = chain, ELO = chain, deck builds = game, match state = game+chain (dual-signed)

### 10.3 Key Interfaces to Extract

```typescript
// IOwnershipValidator — decouples heroDeckStore from HiveDataLayer
interface IOwnershipValidator {
  getOwnedCopies(cardId: number): number;
  canAddCard(cardId: number, heroClass: string, deck: HeroDeck): boolean;
}

// ICardTransferManager — decouples tradeStore from HiveSync+HiveDataStore+HiveEvents
interface ICardTransferManager {
  transferCard(nftUid: string, toUser: string): Promise<Result>;
  transferMultiple(nftUids: string[], toUser: string): Promise<Result>;
}

// IRewardClaimer — decouples campaignStore/dailyQuestStore from HiveSync
interface IRewardClaimer {
  claimReward(rewardId: string, metadata: Record<string, unknown>): Promise<Result>;
}

// IMatchResultBroadcaster — decouples useP2PSync from blockchain
interface IMatchResultBroadcaster {
  broadcastResult(result: MatchResult): Promise<Result>;
  signResultHash(hash: string): Promise<SignatureResult>;
}
```

### 10.4 Zod Contract Strategy
- Define contracts in `shared/contracts/` (one file per domain: ownership, trading, rewards, matches)
- Game code imports only Zod schemas + inferred types (never HiveCardAsset directly)
- SDK implements adapters that satisfy the contracts
- Server validates all API inputs with `.safeParse()`

### 10.5 File Structure (Target)
```
sdk/
├── contracts/           # Zod schemas (source of truth for shared types)
│   ├── ownership.ts     # CardOwnership, CollectionSnapshot
│   ├── trading.ts       # TradeOffer, TradeResult
│   ├── rewards.ts       # RewardClaim, RewardResult
│   ├── matches.ts       # MatchResult, MatchSignature
│   └── identity.ts      # UserIdentity, AuthCredentials
├── adapters/
│   ├── hive/            # Hive-specific implementations
│   │   ├── HiveOwnershipAdapter.ts
│   │   ├── HiveTransferAdapter.ts
│   │   ├── HiveRewardAdapter.ts
│   │   └── HiveMatchAdapter.ts
│   └── local/           # Local/test implementations
│       ├── LocalOwnershipAdapter.ts
│       └── LocalTransferAdapter.ts
├── ports/               # Interface definitions (game-facing API)
│   ├── IOwnershipValidator.ts
│   ├── ICardTransferManager.ts
│   ├── IRewardClaimer.ts
│   └── IMatchResultBroadcaster.ts
└── index.ts             # Public SDK API
```

### 10.6 Migration Path
1. Extract interfaces from current coupling points (18 files)
2. Create Hive adapters that wrap existing HiveSync/HiveDataLayer/HiveEvents
3. Inject adapters at app initialization (replace direct imports)
4. Move Hive-specific code into `sdk/adapters/hive/`
5. Game code imports only from `sdk/ports/` and `sdk/contracts/`

### 10.7 Risks
- **Migration scope**: 15+ game files need injection refactoring
- **Type proliferation**: DTO conversion layer adds boilerplate
- **Event bus unification**: HiveEvents + GameEventBus should merge into one system
- **Testing**: Need mock adapters for all interfaces (local mode already works as template)

---

## Future Ideas (Backlog)

### F1: Class Pet Synergy Cards (instead of class-locking families)

**Context**: Considered hard-locking 12 pet families to specific classes (1 per class, 26 remain neutral). After analysis, hard-locking was rejected:
- 30-card decks + 4-minion battlefield = only 1 class family (7 cards) gives zero choice
- 26 neutral families would still dwarf 1 class family, making the signal weak
- Trigger distribution is lopsided (16 families use `on_deal_damage`) — would create class imbalance
- Removes cross-class pet creativity (warrior running healer pets, etc.)

**Better approach**: Add 12 class-specific pet synergy cards (one per class) that reference a specific `petFamily`, giving a soft incentive without hard restriction.

**Proposed thematic pairings**:

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

**Implementation**: 12 new class cards (one per class, ~3 mana minions) with effects like "Your [Family] pets evolve one trigger faster" or "When a [Family] pet evolves, draw a card". All pet families stay `class: 'Neutral'`.
