# Ragnarok: Norse Mythos Card Game

<p align="center">
  <img src="client/public/ragnarok-logo.jpg" alt="Ragnarok" width="480" />
</p>

<p align="center">
  <strong>A strategic digital card game where gods collide on the battlefield.<br/>Poker combat. Chess tactics. Five mythologies. One war.</strong>
</p>

<p align="center">
  <a href="#the-game">The Game</a>&ensp;&bull;&ensp;
  <a href="#features">Features</a>&ensp;&bull;&ensp;
  <a href="#norse-mechanics">Norse Mechanics</a>&ensp;&bull;&ensp;
  <a href="#ragnarok-chess">Ragnarok Chess</a>&ensp;&bull;&ensp;
  <a href="#poker-combat">Poker Combat</a>&ensp;&bull;&ensp;
  <a href="#campaign">Campaign</a>&ensp;&bull;&ensp;
  <a href="#quick-start">Quick Start</a>&ensp;&bull;&ensp;
  <a href="#tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/cards-2%2C400%2B-gold?style=flat-square" />
  <img src="https://img.shields.io/badge/heroes-80-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/mythologies-5-red?style=flat-square" />
  <img src="https://img.shields.io/badge/campaign_missions-49-green?style=flat-square" />
  <img src="https://img.shields.io/badge/pet_families-38-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/typescript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/blockchain-hive-E31337?style=flat-square" />
</p>

---

## The Game

Ragnarok is a collectible card game that fuses three systems into one: **card battling with Norse-original mechanics**, a **7x5 strategic chess board**, and **Texas Hold'em poker combat** where HP is your betting currency. Choose your army of gods, maneuver them across the board, and when pieces collide — play poker with your life.

Five mythological pantheons clash for supremacy. Norse frost giants wage war against Greek Olympians. Egyptian pharaohs face Celtic druids. And when all four campaigns fall, a secret Eastern chapter awaits — where Chinese dragons, Japanese kami, and Hindu devas unite for the final battle.

---

## Features

### Core Gameplay
- **2,400+ collectible cards** with battlecry, deathrattle, combo, discover, wager, and 48 keyword mechanics
- **80 playable heroes** across 12 classes — Mage, Warrior, Priest, Rogue, Paladin, Hunter, Druid, Warlock, Shaman, Berserker, Death Knight, Necromancer
- **6 unique Norse mechanics** — Blood Price, Einherjar, Prophecy, Realm Shift, Ragnarok Chain, Pet Evolution
- **Ragnarok Chess** — 7x5 board where god-pieces maneuver and collisions trigger poker combat
- **Texas Hold'em poker combat** — bet HP, read bluffs, and resolve battles with Norse-themed hand rankings
- **8 status effects** with themed visual overlays — Poison, Bleed, Burn, Freeze, Paralysis, Weakness, Vulnerable, Marked
- **Element system** — Fire, Water, Wind, Earth, Holy, Shadow with advantage bonuses

### Campaign: War of the Pantheons
- **49 hand-crafted missions** across 5 mythological chapters
- **Nine Realms constellation map** — navigate Ginnungagap, Asgard, Midgard, Niflheim, Muspelheim, Jotunheim, Vanaheim, Alfheim, Svartalfheim, Helheim
- **Greek world map** — 10 missions from Chaos to the Seeds of Strife (Hesiod's Theogony / Apollodorus' Library)
- **Themed AI enemies** — fight gods and monsters matching each realm's mythology
- **Boss rules** — extra health, bonus mana, passive damage, minion summons
- **Secret Eastern chapter** — 10 boss-tier missions unlocked after completing all campaigns, featuring Chinese, Japanese, and Hindu mythology
- **Escalating difficulty** with unique AI behavior profiles per mission

### Multiplayer & Social
- **P2P multiplayer** via WebRTC (PeerJS) — no server bottleneck
- **Ranked matchmaking** with ELO-based ladder
- **Tournament system** — Swiss + single elimination brackets
- **Spectator mode** — watch live matches (read-only P2P)
- **Match replay viewer** — action timeline with playback controls
- **Friends list** with online presence and challenge invites
- **Deck import/export** via shareable base64 codes

### Economy & Progression
- **Card trading** — P2P trade offers with NFT cards
- **Card evolution** — 3 tiers: Mortal (60-70%) → Ascended (80-90%) → Divine (100%)
- **Daily quest system** — 19 quest templates, 3 active per day
- **Pack opening** — commit-reveal with delayed irreversible Hive block entropy (anti-grind, anti-selective-reveal)
- **RUNE rewards** — +10 per ranked win, +3 per loss, milestone bonuses (non-transferable in v1)
- **Eitr crafting** — dissolve cards to see Eitr value (display only in v1 — forging and Eitr trading disabled until replay-derived)

### Blockchain (Hive Layer 1 — Protocol v1.2)
- **Reader-defined L1 asset protocol** — canonical state derived from irreversible Hive block replay, not a smart contract
- **29 canonical operations** — v1.0 base (14 ops) + v1.1 pack NFTs & DNA lineage (6 ops) + v1.2 marketplace & DUAT (9 ops)
- **Shared replay core** — one isomorphic protocol engine used by both browser and server (no duplicate validation)
- **Commit-reveal pack opening** — delayed irreversible block entropy with auto-finalize on 200-block deadline
- **Atomic transfers** — 0.001 HIVE companion transfer for L1 explorer visibility (PeakD, HiveScan)
- **Pack NFTs** — sealed packs as tradeable NFTs with deterministic DNA; burn to open
- **DNA lineage** — every card has originDna (genotype) + instanceDna (phenotype); replicate and merge ops
- **On-chain marketplace** — 6 ops (list, unlist, buy, offer, accept, reject) with trustless payment verification
- **DUAT holder airdrop** — 30% of supply (164,460 packs) to 3,511 DUAT token holders; 90-day claim window
- **Dual-signature match results** with Merkle transcript anchoring and PoW
- **Supply caps** — per-card limits: 2,000 common, 1,000 rare, 500 epic, 250 mythic
- **Anti-cheat** — Mandatory WASM engine, PoW, slash evidence, nonce anti-replay, STUN/TURN NAT traversal
- **6-tier decentralized indexer** — on-chain CID → IPFS → Hive fallback → HafSQL → bundled snapshot → P2P relay
- **Cold multisig governance** — genesis → seal lifecycle permanently closes admin minting

### Multiplayer (P2P WebRTC)

- **Peer-to-peer** — no central server required; game can't be shut down
- **STUN/TURN** — 7 STUN servers + TURN relay for cross-continent NAT traversal (~85% global success)
- **Madden-style disconnect protection** — 15s grace period with countdown before match ends
- **Heartbeat keepalive** — 5s ping detects dead connections before PeerJS notices
- **Message buffer** — 50-message queue during disconnect, replayed in order on reconnect
- **Exponential reconnect** — 3 attempts (2s → 5s → 10s backoff), 92s total budget

---

## Norse Mechanics

Six original game mechanics rooted in Norse mythology — not found in any other card game.

### Blood Price (8 cards)
**Pay health instead of mana.** Blood Price minions can be played at full mana cost OR by sacrificing health equal to their blood price value. Right-click a card in hand to toggle payment mode. Risk your life for tempo.

### Einherjar (6 cards)
**Warriors who fall in battle return stronger.** When an Einherjar minion dies, it shuffles back into your deck with +1/+1. Each warrior can return up to 3 times — just like the fallen heroes of Valhalla who feast and fight for eternity.

### Prophecy (7 cards)
**Visible countdown timers on the board.** Play a Prophecy card to place a ticking timer that both players can see. When the countdown reaches zero, the prophecy resolves — dealing damage, buffing allies, summoning minions, or transforming the battlefield. 7 resolve effect types.

### Realm Shift (9 cards)
**Change the rules of the battlefield.** Shift the active realm to one of the Nine Realms, each imposing board-wide effects:
- **Asgard** — +1 Attack to all minions
- **Niflheim** — Freeze a random enemy each turn
- **Muspelheim** — 1 damage to all minions at turn end
- **Jotunheim** — -1 Health to all minions
- **Helheim** — Deathrattle minions return to hand
- And 4 more realms with unique effects

### Ragnarok Chain (10 cards)
**Linked-destiny pairs from Norse mythology.** 5 mythological pairs (Fenrir & Tyr, Jormungandr & Thor, etc.) share a linked fate. When both partners are on the battlefield, they gain powerful buffs. When one dies, the partner suffers a devastating penalty.

### Pet Evolution — 3-3-1 System (266 cards)

The crown jewel of Norse mechanics. **38 Norse-themed pet families** with a branching evolution system:

```
Stage 1 (Common)          Stage 2 (Rare)           Stage 3 (Mythic)
┌─ Fire Variant ──────── Fire Evolved ───┐
├─ Water Variant ─────── Water Evolved ──┼──── Ultimate Form
└─ Neutral Variant ───── Neutral Evolved ┘
```

- **3 Stage 1** pets per family (one per element variant)
- **3 Stage 2** evolutions (each Stage 1 evolves into its Stage 2)
- **1 Stage 3** ultimate form (all paths converge)
- **Stage 2 & 3 cost 0 mana** — evolution is free when triggered
- **15 evolution triggers** — deal damage, destroy a minion, survive a turn, cast a spell, and more
- **Stage 3 "?" stats** — unevolved Stage 3 cards show "?" for ATK/HP with a cyan glow until evolved, keeping final stats mysterious
- **Element advantage** — +2 bonus damage when attacking a weak element
- **Hero synergy** — +1 Health when pet element matches hero element

Families include: Fenrir Wolves, Jormungandr Serpents, Odin's Ravens, Yggdrasil Stags, Storm Drakes, Frost Giants, Valkyries, Draugr, Bifrost Guardians, Thor's Goats, Dwarven Forgemasters, Norns, and 26 more.

---

## Ragnarok Chess

A strategic chess variant on a 7x5 grid where your army of gods battles for supremacy.

```
Row 6: Rook  │ Bishop│ King  │ Queen │ Knight    ← Opponent
Row 5: Pawn  │ Pawn  │ Pawn  │ Pawn  │ Pawn
Row 4: ░░░░░ │ ░░░░░ │ ░░░░░ │ ░░░░░ │ ░░░░░
Row 3: ░░░░░ │ ░░░░░ │ ░░░░░ │ ░░░░░ │ ░░░░░
Row 2: ░░░░░ │ ░░░░░ │ ░░░░░ │ ░░░░░ │ ░░░░░
Row 1: Pawn  │ Pawn  │ Pawn  │ Pawn  │ Pawn
Row 0: Knight│ Queen │ King  │ Bishop│ Rook      ← Player
```

### Army Selection

| Slot | Role | Hero Pool |
|------|------|-----------|
| **King** | 9 Primordial Norse Kings | Ymir, Buri, Surtr, Borr, Yggdrasil, Audumbla, Gaia, Brimir, Ginnungagap, Tartarus |
| **Queen** | Mage / Warlock / Necromancer | Zeus, Odin, Hades, Chronos, Izanami, Ammit... |
| **Rook** | Warrior / Paladin | Ares, Thor, Hephaestus, Sarutahiko... |
| **Bishop** | Priest / Druid | Poseidon, Aphrodite, Ma'at, Kamimusubi... |
| **Knight** | Rogue / Hunter | Hermes, Artemis, Nyx, Tsukuyomi, Serqet... |

### Combat Resolution

| Attacker → Defender | Result |
|---------------------|--------|
| Pawn or King → Any | Instant kill (Valkyrie Weapon) |
| Any → Pawn | Instant kill |
| Major → Major | **Poker Combat** |

### Stamina System

Each piece has **Stamina = HP / 10**. Moving a piece grants **+1 STA to all allies**. Stamina caps your maximum bet: **1 STA = 10 HP max wager**.

### King Divine Commands

Each King places invisible landmine traps that drain enemy Stamina:

| King | Mine Pattern | Penalty |
|------|-------------|---------|
| Ymir | Single tile | -2 STA |
| Surtr | 3x3 area | -2 center, -1 edges |
| Yggdrasil | Cross pattern | -2 STA |
| Ginnungagap | Random scatter | -3 STA |

---

## Poker Combat

When major pieces collide, combat is resolved through Texas Hold'em — but **HP is your chips**.

### Phases

| Phase | Name | What Happens |
|-------|------|------------|
| 0 | **First Strike** | Attacker deals 15 damage |
| 1 | **Mulligan** | Replace hole cards |
| 2 | **Blinds** | SB: 5 HP, BB: 10 HP, Ante: 0.5 HP each |
| 3 | **Faith** (Flop) | 3 community cards revealed |
| 4 | **Foresight** (Turn) | 4th card revealed |
| 5 | **Destiny** (River) | 5th card revealed |
| 6 | **Resolution** | Compare hands, heal winner, punish loser |

### Norse Hand Rankings

Pure No-Limit Hold'em — best hand wins the pot. No damage multipliers. You lose only what you bet.

| Rank | Name | Poker Equivalent |
|------|------|------------------|
| 10 | **RAGNAROK** | Royal Flush |
| 9 | **Divine Alignment** | Straight Flush |
| 8 | **Godly Power** | Four of a Kind |
| 7 | **Valhalla's Blessing** | Full House |
| 6 | **Odin's Eye** | Flush |
| 5 | **Fate's Path** | Straight |
| 4 | **Thor's Hammer** | Three of a Kind |
| 3 | **Dual Runes** | Two Pair |
| 2 | **Rune Mark** | One Pair |
| 1 | **High Card** | High Card |

### Betting Actions

| Action | Poker Term | Effect |
|--------|-----------|--------|
| **Attack** | Bet | Commit HP as wager |
| **Counter Attack** | Raise | Increase commitment |
| **Engage** | Call | Match opponent's wager |
| **Brace** | Fold | Forfeit committed HP, -1 STA |
| **Defend** | Check | Pass action, +1 STA |

### Resolution

The winner **heals back their committed HP**. The loser **keeps their loss permanently**. Folding forfeits all committed HP plus a stamina penalty.

---

## Campaign

### War of the Pantheons

Five mythological campaigns with 49 hand-crafted missions featuring unique narratives, themed AI armies, and escalating boss mechanics.

#### Norse — Echoes of Ymir (9 missions)
Follow the chronological Norse creation myth from Ginnungagap through Ragnarok. Face Ymir in the primordial void, witness the world forged from his body, breathe life into Ask and Embla, build the halls of Asgard, and survive the Vanir War — culminating in a Twilight Omen of Ragnarok.

#### Greek — Echoes of Chaos: Blood of the Olympians (10 missions)
Follow Hesiod's Theogony and Apollodorus' Library from Chaos through the Heroic Age. Battle Gaia's brood in the primordial void, dethrone Uranus, survive Cronus the Devourer, forge Zeus's thunderbolts, storm the Titanomachy, witness Prometheus's defiance, face Typhon and the Giants, and navigate the seeds of divine strife that doom Olympus.

#### Egyptian — The Afterlife
Walk the path of the dead through Ma'at's judgment hall, Ra's sun barge, and the throne of the Pharaoh. Face Ammit the Devourer, Set's storms, the serpent Apophis.

#### Celtic — The Otherworld
Enter the misty realm of druids, the Morrigan's battlefield, Cu Chulainn's rage, Balor's evil eye, and the Wild Hunt. End at the Battle of Mag Tuired.

#### Eastern — The Celestial Gate (Secret, 10 missions)
*Unlocked after completing all four base campaigns.* 10 boss-tier missions spanning Chinese dragons, Japanese kami (Amaterasu, Susanoo, Izanami), Hindu devas (Ganesha, Kali), and a final battle where ALL mythologies collide: **Ragnarok of All Worlds**.

---

## Status Effects

Every status effect has full visual feedback — themed glows, overlays, and icon badges on affected minions.

| Icon | Effect | Damage/Impact | Visual |
|------|--------|---------------|--------|
| ☠️ | **Poison** | 3 damage per turn | Toxic green mist rising |
| 🩸 | **Bleed** | +3 damage taken on hit | Crimson drip pulse |
| 🔥 | **Burn** | +3 Attack, 3 self-damage on attack | Orange flame flicker |
| ❄️ | **Freeze** | Cannot act (clears end of turn) | Ice blue frost overlay |
| ⚡ | **Paralysis** | 50% chance to fail actions | Electric indigo crackle |
| ⬇️ | **Weakness** | -3 Attack | Muted purple dim |
| 🎯 | **Vulnerable** | +3 damage taken from all sources | Red vignette glow |
| 👁️ | **Marked** | Can always be targeted (ignores Stealth) | Gold highlight |

---

## Keywords & Abilities

### Triggered
| Keyword | Effect |
|---------|--------|
| **Battlecry** | Triggers when played from hand |
| **Deathrattle** | Triggers when the minion dies |
| **Combo** | Bonus if another card was played first |
| **Inspire** | Triggers on Hero Power use |
| **Frenzy** | Triggers first time this survives damage |
| **Spellburst** | Triggers once after you cast a spell |
| **Overkill** | Triggers on excess lethal damage |
| **Outcast** | Bonus if leftmost or rightmost in hand |

### Persistent
| Keyword | Effect |
|---------|--------|
| **Taunt** | Enemies must attack this first |
| **Divine Shield** | First damage is ignored |
| **Stealth** | Cannot be targeted until it attacks |
| **Windfury** | Can attack twice per turn |
| **Lifesteal** | Damage dealt heals your hero |
| **Poisonous** | Destroys any minion damaged by this |
| **Reborn** | Returns to life with 1 Health |
| **Charge** | Can attack immediately |
| **Rush** | Can attack minions immediately |

### Norse-Original
| Keyword | Effect |
|---------|--------|
| **Blood Price** | Pay health instead of mana to play this card |
| **Einherjar** | Returns to deck with +1/+1 when destroyed (max 3) |
| **Prophecy** | Visible countdown timer; resolves when it hits zero |
| **Rune** | Hidden trap that triggers on specific enemy actions |
| **Runic Bond** | Attach this to a friendly Automaton to fuse stats |
| **Pet Evolution** | Transform into a stronger form when trigger is met |

---

## Card System

### 2,400+ Cards Across 6 Sets

| Range | Category |
|-------|----------|
| 1000-3999 | Neutral minions (common → epic) |
| 4000-8999 | Class cards (12 classes) |
| 9000-9249 | Tokens (non-collectible) |
| 20000-29967 | Norse Mythology set |
| 29800-29967 | Artifacts & Armor |
| 30001-30410 | Norse Mechanics (Blood Price, Einherjar, Prophecy, Realm Shift, Chain) |
| 31001-31905 | Expansion gap-fill (synergy, deep keywords, lifesteal) |
| 32101-32106 | Greek Mythic Minions (Cerberus, Typhon, Atlas, Medusa...) |
| 36001-36406 | Class expansion I (DK, Necro, Berserker, Rogue, Paladin) |
| 38001-39104 | Class expansion II (all 12 classes — completeness pass) |
| 50000-50376 | Pet Evolution (38 families, 266 cards) |
| 85001-85010 | Rogue specialty |
| 90000-99999 | Hero cards |

### Rarities

| Rarity | Deck Limit | NFT Supply (per card) |
|--------|-----------|----------------------|
| Common | 2 copies | 1,800 |
| Rare | 2 copies | 1,250 |
| Epic | 2 copies | 750 |
| Mythic | 1 copy | 500 |

### Races

| Race | Description |
|------|-------------|
| Beast | Natural creatures and beasts of Norse legend |
| Dragon | Wyrms, drakes, and serpents |
| Elemental | Spirits of fire, ice, storm, and earth |
| Automaton | Dwarven constructs and mechanical beings |
| Naga | Sea-dwelling serpent folk |
| Titan | Ancient primordial giants |
| Einherjar | Fallen warriors chosen for Valhalla |
| Spirit | Totemic and spectral entities |
| Undead | Draugr, revenants, and the restless dead |
| Pirate | Raiders and seafarers |

---

## Element System

Every hero and minion has an element. Each element is **strong against 2** and **weak against 2**, creating a web of matchups — not a simple circle.

| Element | Strong Against | Weak Against | Color |
|---------|---------------|-------------|-------|
| 🔥 **Fire** | Earth, Wind | Water, Holy | `#ff6b35` |
| 💧 **Water** | Fire, Shadow | Earth, Wind | `#4fc3f7` |
| 🌪️ **Wind** | Water, Holy | Fire, Earth | `#81c784` |
| 🌍 **Earth** | Wind, Shadow | Fire, Water | `#a1887f` |
| ✨ **Holy** | Fire, Shadow | Wind, Shadow | `#ffd54f` |
| 🌑 **Shadow** | Holy, Wind | Water, Earth | `#9c27b0` |
| ⚪ **Neutral** | — | — | `#9e9e9e` |

Attacking with elemental advantage grants **+2 Attack, +2 Health, +20 Armor**.

---

## Blockchain: Hive NFT System

All card ownership, match results, and rewards live on Hive Layer 1 as `custom_json` operations. Canonical state is derived from irreversible block replay — the server is a cache, the chain is truth.

```
Genesis → Mint Batches → Seal → Admin minting permanently closed
                                  ↓
    Canonical writes use `ragnarok-cards` app ID
    Legacy `rp_*` ops accepted as aliases indefinitely
    Pack opening via commit-reveal (not txid-seeded)
    ELO, RUNE, XP all chain-derived by replay engine
```

- **Protocol spec**: [`docs/RAGNAROK_PROTOCOL_V1.md`](docs/RAGNAROK_PROTOCOL_V1.md) — frozen normative specification
- **Conformance suite**: 170 tests (37 golden vectors + 38 replay traces + 95 existing)
- **Server indexer**: Sequential irreversible block scan via `get_ops_in_block` + LIB cursor
- **Client replay**: Shared `protocol-core` module with LIB-gated application

---

## Quick Start

```bash
git clone https://github.com/Dhenz14/norse-mythos-card-game.git
cd norse-mythos-card-game
npm install
npm run dev
```

Opens at `http://localhost:5000`. No database required for single-player — PostgreSQL is optional for server features.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Vite + Express) |
| `npm run build` | Production build |
| `npm run check` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run build:wasm` | Build WASM anti-cheat engine |

---

## Current Engineering Focus

- **Systems cleanup over surface polish** — the current tranche is focused on reducing repo-wide TypeScript and ESLint debt in the highest-complexity gameplay and protocol modules first.
- **Combat stability** — `AttackSystem.tsx` and `RagnarokCombatArena.tsx` have been refactored toward smaller resolution paths and clearer action hierarchy so live play feels less flaky under repeated attack / betting sequences.
- **Shared replay maintenance** — `shared/protocol-core/apply.ts` is being kept as the single deterministic protocol path for browser and server, with settlement, minting, merge, and marketplace flows split into more explicit helpers.
- **Browser QA** — responsive campaign layout received a mobile spacing pass to stop constellation lore overlays from colliding with realm nodes; a broader live-play spacing and motion QA pass is still part of the long-term polish work.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **State** | Zustand 5 (20+ specialized stores) |
| **Styling** | Tailwind CSS 3.4, CSS custom properties |
| **Effects** | Framer Motion, React Spring, React Three Fiber |
| **UI** | Radix UI (shadcn/ui) |
| **Multiplayer** | PeerJS (WebRTC P2P) |
| **Backend** | Express + TypeScript |
| **Database** | PostgreSQL + Drizzle ORM (optional) |
| **Local Storage** | IndexedDB (13 stores for chain replay) |
| **Blockchain** | Hive Layer 1 via hive-tx v7 |
| **Anti-Cheat** | AssemblyScript WASM (35KB binary, SHA-256 hash verification) |
| **Caching** | Service Worker asset cache |

### Architecture

```
client/src/
├── game/
│   ├── campaign/          # 49 missions, 5 chapters, world maps
│   ├── combat/            # Poker combat arena + hooks
│   ├── components/        # Card, chess, campaign, collection, trading UI
│   ├── crafting/          # Eitr economy (display only in v1)
│   ├── data/              # 2,400+ cards + 80 heroes + 38 pet families
│   ├── effects/           # 181 effect handlers (battlecry, deathrattle, spell)
│   ├── engine/            # WASM loader + bridge (mandatory, no TS fallback)
│   ├── spectator/         # Read-only P2P viewer
│   ├── stores/            # 20+ Zustand stores
│   ├── tournament/        # Swiss + elimination brackets
│   └── tutorial/          # 15-step onboarding
├── data/blockchain/       # Hive NFT replay adapter (delegates to shared/protocol-core)
└── components/ui/         # Radix/shadcn components

shared/protocol-core/      # Isomorphic replay engine (browser + Node)
├── types.ts               # StateAdapter, CardAsset, GenesisRecord, etc.
├── normalize.ts           # Legacy mapping, authority checking
├── apply.ts               # Deterministic protocol handlers for settlement, minting, packs, lineage, marketplace
├── hash.ts                # Canonical serialization + SHA-256
└── pow.ts                 # PoW verification

server/
├── routes/                # Matchmaking, social, trading, tournaments
└── services/              # Block-scanning indexer, tournament manager, auth
```

---

## Roadmap

### Completed

- [x] 2,400+ cards with 181 effect handlers (94 battlecry, 16 deathrattle, 71 spell)
- [x] 80 heroes across 12 classes and 5 mythological factions
- [x] 6 Norse-original mechanics (Blood Price, Einherjar, Prophecy, Realm Shift, Ragnarok Chain, Pet Evolution)
- [x] Pet Evolution 3-3-1 system (38 families, 266 cards, element advantage, hero synergy)
- [x] Ragnarok Chess (7x5 board with poker combat collisions)
- [x] Texas Hold'em poker combat with Norse hand rankings
- [x] 49-mission campaign across 5 mythological chapters
- [x] Nine Realms constellation map + Greek world map (Hesiod/Apollodorus lore)
- [x] Secret Eastern chapter (Chinese/Japanese/Hindu)
- [x] Greek campaign rewrite: "Echoes of Chaos: Blood of the Olympians" (10 missions)
- [x] 82-card class completeness expansion (all 12 classes audited and gap-filled)
- [x] 6 Greek mythic minion cards (Cerberus, Typhon, Porphyrion, Atlas, Campe, Medusa)
- [x] 3 new heroes: Prometheus (druid), Heracles (warrior), Rhea (priest)
- [x] P2P multiplayer via WebRTC
- [x] Ranked matchmaking with ELO ladder
- [x] Tournament system (Swiss + elimination)
- [x] Eitr crafting system (dissolve display; forge and Eitr trading disabled in v1 until replay-derived)
- [x] Spectator mode + match replay viewer
- [x] Daily quest system (19 templates)
- [x] Friends list with presence + challenges
- [x] Hive NFT blockchain integration
- [x] WASM anti-cheat engine — mandatory, no TS fallback, 33 enforcement tests
- [x] 8 status effects with visual overlays
- [x] Service Worker asset caching
- [x] Deck import/export via shareable codes
- [x] Tutorial overlay (15-step onboarding)
- [x] Settings system (audio, visual, gameplay, keybindings)
- [x] Card evolution (Mortal → Ascended → Divine)
- [x] Artifact & armor equipment system
- [x] 47 keyword definitions with descriptions
- [x] Norse terminology throughout (Rune, Runic Bond, Yggdrasil Golem, Automaton, Naga)

- [x] Protocol v1.0 frozen — 14 canonical ops, 5 launch gates closed
- [x] Shared `protocol-core` module — one replay engine for browser + server
- [x] Block-complete server indexer (`get_ops_in_block` + LIB cursor)
- [x] Commit-reveal pack opening with auto-finalize (anti-grind, anti-selective-reveal)
- [x] Pinned-pubkey match anchoring (post-seal verification uses payload keys only)
- [x] Real Hive signature verification (hive-tx ECDSA recovery)
- [x] 192 tests (37 conformance vectors + 38 replay traces + 117 existing)

- [x] Protocol v1.1 — atomic transfers, pack NFTs, DNA lineage (6 new ops)
- [x] Protocol v1.2 — on-chain marketplace (6 ops), broadcast hardening, NFTLox integration
- [x] DUAT airdrop system — 30% supply (164,460 packs) to 3,511 token holders, 90-day claim window
- [x] Card visual overhaul — 50+ SVG keyword icons, SVG stat emblems, rarity gems
- [x] Campaign story mode — per-mission narrative intro, AAA cinematic crawl with letterbox
- [x] P2P resilience — STUN/TURN, 15s grace period, heartbeat, message buffer, exponential reconnect
- [x] 6-tier decentralized indexer — IPFS + HafSQL fallback, zero server required
- [x] Marketplace UI — `/marketplace` with browse, list, buy, offer

### Next: Genesis Launch

- [ ] Create @ragnarok Hive account (2-of-3 multisig, no standalone keys)
- [ ] Create @ragnarok-genesis Hive account (2-of-3 multisig, same signers)
- [ ] Create @ragnarok-treasury Hive account (2-of-3 initial, expandable via WoT)
- [ ] Tabletop rehearsal (signing flow, retry ledger, LIB verification, hash bundle)
- [ ] Multisig genesis → mint batches → seal → brick genesis authority
- [ ] Post-seal validation (fresh replay, pack opening, cross-node consistency)
- [ ] See [GENESIS_RUNBOOK.md](docs/GENESIS_RUNBOOK.md) for full ceremony procedures

---

## Documentation

| Document | Description |
|----------|-------------|
| [RAGNAROK_PROTOCOL_V1.md](docs/RAGNAROK_PROTOCOL_V1.md) | **Frozen protocol spec** — 14 base ops, authority matrix, finality rules, launch gates |
| [ATOMIC_NFT_PACKS_DESIGN.md](docs/ATOMIC_NFT_PACKS_DESIGN.md) | **Protocol v1.1** — atomic transfers, pack NFTs, DNA lineage (6 new ops) |
| [PROTOCOL_V1_2_DESIGN.md](docs/PROTOCOL_V1_2_DESIGN.md) | **Protocol v1.2** — marketplace, broadcast hardening, NFTLox integration, card visuals |
| [DUAT_AIRDROP_DESIGN.md](docs/DUAT_AIRDROP_DESIGN.md) | **DUAT airdrop** — 30% supply to 3,511 holders, claim window, treasury absorption |
| [DECENTRALIZED_INDEXER_DESIGN.md](docs/DECENTRALIZED_INDEXER_DESIGN.md) | **Light HAF** — 6-tier IPFS index, WoT operators, HafSQL fallback |
| [RULEBOOK.md](docs/RULEBOOK.md) | Complete game rules with examples |
| [GAME_FLOW.md](docs/GAME_FLOW.md) | Game flow diagrams and state management |
| [GENESIS_RUNBOOK.md](docs/GENESIS_RUNBOOK.md) | **Operational ceremony guide** — multisig signing, checkpoints, emergency procedures |
| [HIVE_BLOCKCHAIN_BLUEPRINT.md](docs/HIVE_BLOCKCHAIN_BLUEPRINT.md) | Hive NFT architecture (legacy — protocol spec is now canonical) |
| [CLAUDE.md](CLAUDE.md) | Technical architecture reference |

---

## Contributing

```bash
# Fork → Clone → Branch
git checkout -b feature/your-feature

# Develop
npm run dev       # Hot reload at localhost:5000
npm run check     # TypeScript validation
npm run build     # Production build test

# Submit
git push origin feature/your-feature
# Open a Pull Request
```

**Standards**: Tabs, camelCase, PascalCase components, 20-30 line functions, Zustand over Context.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with React, TypeScript, and the fury of the Norse gods.</sub>
</p>
