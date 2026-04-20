# Art Status — Single Source of Truth

> **Updated:** 2026-03-15

---

## How the Art System Works

There are **3 independent categories** of art:

| Category | System | Count | Location |
|----------|--------|-------|----------|
| **Card Art** | `CARD_ID_TO_ART` (single source of truth, by numeric card ID) | 1,715 entries | `artMapping.ts` |
| **Hero Art** | `HERO_ART_OVERRIDE` (heroId -> art file basename) | 83 heroes with art | `artMapping.ts` |
| **King Art** | `portrait` field in `ChessPieceConfig.ts` | 11 kings with art | `ChessPieceConfig.ts` |

**Card art lookup:** `CARD_ID_TO_ART` is the primary and only authoritative map. Legacy `VERCEL_CARD_ART` and `MINION_CARD_TO_ART` maps are deprecated — all their entries have been merged into `CARD_ID_TO_ART`.

**Hero art lookup:** `HERO_ART_OVERRIDE` (direct heroId -> art file) > `CHARACTER_ART_IDS` (fallback)

**King art:** Hardcoded portrait paths in ChessPieceConfig.ts. Kings are NOT in HERO_ART_OVERRIDE. **Kings are OFF LIMITS.**

---

## Summary

| Metric | Count |
|--------|-------|
| Total unique cards in registry | 2,257 |
| Cards WITH art | 1,600 (70.9%) |
| Cards WITHOUT art | **657** (420 collectible + 97 super minions + 74 hero weapons + 12 tokens + 54 other) |
| Deck-builder visible missing | **420** collectible cards |
| Super minions missing | **97** (visible in deck builder) |
| Hero weapon upgrades missing | **74** (hero cards, 90xxx) |
| Tokens missing (9xxx) | 12 |
| Other non-collectible missing | 54 |
| Art files on disk (.webp) | ~2,054 |
| CARD_ID_TO_ART entries | 1,715 |
| Orphan CARD_ID_TO_ART entries | **6** (stale mappings to deleted card IDs) |
| Total heroes in game | 94 |
| Heroes with art | 83 (88.3%) |
| Heroes needing art (visible in deck builder) | **7** |
| Heroes needing art (not yet in deck builder) | **4** |
| Kings with portrait | 11 / 14 |
| Kings needing portrait | **3** (king-leif, king-askr, king-embla) |

---

## Art That IS Working (Do Not Re-Create)

### Heroes with Art (83 heroes) — DO NOT DUPLICATE

These heroes have art files on disk via `HERO_ART_OVERRIDE`:

**Norse Gods (34):** Odin, Thor, Freya, Loki, Baldur, Heimdall, Tyr, Vidar, Hel, Skadi, Aegir, Ullr, Eir, Frey, Bragi, Kvasir, Forseti, Mani, Sol, Sinmara, Idunn, Sigyn, Fjorgyn, Gerd, Ran, Njord, Gefjon, Hoder, Vili, Ve

**Additional Norse (14):** Thorgrim, Valthrud, Logi, Magni, Brakki, Thryma, Eldrin, Myrka, Fjora, Ylva, Gormr, Lirien, Solvi, Erik Flameheart

**Greek Gods (16):** Zeus, Athena, Hades, Dionysus, Persephone, Ares, Hephaestus, Poseidon, Demeter, Apollo, Artemis, Aphrodite, Hestia, Hyperion, Chronos, Hermes

**Base/Common (11):** Ragnar Ironside, Sigurd, Gullveig, Groa, Hervor, Bjorn Ironside, Nanna, Volva, Gudrun, Frigg, Bestla

**Other (8):** Hermod, Starkad, Nyx, Ammit, Serqet, Khepri, Izanami, Sarutahiko

### Kings with Art (11 kings) — OFF LIMITS

Kings have hardcoded portrait PNGs in ChessPieceConfig. These are separate from the hero system:

Ymir, Buri, Surtr, Borr, Yggdrasil, Audumbla, Gaia, Brimir, Ginnungagap, Tartarus, Uranus

---

## Art That IS Needed

### Heroes Needing Art — In Deck Builder (7)

These heroes appear in the deck builder but have no art:

| Hero ID | Name | Class | Chess Piece | Notes |
|---------|------|-------|-------------|-------|
| hero-brynhild | Brynhild | priest | Bishop | Norse valkyrie |
| hero-eros | Eros | hunter | Knight | Greek god of love |
| hero-fujin | Fujin | mage | Queen | Japanese wind god |
| hero-hera | Hera | shaman | Bishop | Greek queen of gods |
| hero-heracles | Heracles | warrior | Rook | Greek demigod |
| hero-perseus | Perseus | rogue | Knight | Greek hero |
| hero-tsukuyomi | Tsukuyomi | priest | Bishop | Japanese moon god |

### Heroes Needing Art — Common/Standard Tier, Newly Added (5)

These heroes were just added to the deck builder as common (STANDARD edition) tier:

| Hero ID | Name | Class | Chess Piece | Notes |
|---------|------|-------|-------------|-------|
| hero-hecate | Hecate | warlock | Queen | Greek goddess of magic |
| hero-helios | Helios | priest | Bishop | Greek sun titan |
| hero-prometheus | Prometheus | druid | Bishop | Greek titan of foresight |
| hero-rhea | Rhea | priest | Bishop | Greek mother of Olympians |
| hero-selene | Selene | rogue | Knight | Greek moon goddess |

### Kings Needing Portrait (3)

| King ID | Notes |
|---------|-------|
| king-leif | Leif the Wayfinder (base/free starter) |
| king-askr | Askr, First Man (common tier) |
| king-embla | Embla, First Woman (common tier) |

### Cards Needing Art — Deck Builder Visible (374)

Breakdown by ID range:

| Range | Category | Missing | Priority |
|-------|----------|---------|----------|
| 33000-33999 | Expansion cards | 154 | HIGH — largest gap |
| 20000-20999 | Norse mythology core | 44 | HIGH — core set |
| 32000-32999 | Expansion cards | 34 | HIGH |
| 30000-30999 | Norse mechanics | 28 | HIGH — unique mechanics |
| 4000-4999 | Class minions | 17 | MEDIUM |
| 5000-5999 | Class spells/utility | 14 | MEDIUM |
| 18000-18999 | Legacy cards | 10 | LOW |
| 1000-3999 | Core minions | 9 | MEDIUM |
| 12000-12999 | Recruit cards | 5 | LOW |
| 21000-29999 | Norse misc | 24 | MEDIUM |
| 31000-31999 | Norse expansion | 3 | HIGH |
| 38000-39999 | Class expansions | 7 | MEDIUM |
| 86000-86999 | Rogue cards | 1 | LOW |
| 91000-92999 | Elder Titan support | 26 | LOW |
| Other | Various | 2 | LOW |

### Cards Needing Art — NOT in Deck Builder (204)

| Category | Missing / Total | Notes |
|----------|----------------|-------|
| Super minions (95xxx) | 77 / 82 | Hero-specific summons |
| Weapon upgrades (90xxx) | 74 / 77 | Hero weapon cards |
| Tokens (9xxx) | 9 / 55 | Generated/transient cards |
| Other non-collectible | 44 / 132 | Internal cards |

---

## Orphan Art Mappings (6)

Only **6** entries in `CARD_ID_TO_ART` point to card IDs that don't exist in the registry:

| ID | Art File | Likely Cause |
|----|----------|--------------|
| 7520 | `649b-b7101782.webp` | Card deleted during refactor |
| 31009 | `df37-c092d66b.webp` | Card deleted during race casing fix |
| 31035 | `51f3-58b8462c.webp` | Card deleted |
| 31036 | `bda7-1152c17c.webp` | Card deleted |
| 35005 | `8198-24f0cced.webp` | Card deleted during IP purge |
| 35014 | `eb59-e8c1abc1.webp` | Card deleted |

All 6 art files exist on disk. These can be deleted from the map or reassigned to artless cards if visually appropriate.

---

## Duplicate Card Names (1)

Only one duplicate card name in the missing art list:

| Name | IDs | Action |
|------|-----|--------|
| Muspel | 92002, 4351 | Should be deduplicated — same creature, two cards |

---

## How to Add New Art

### For Card Art
1. Place `.webp` file in `client/public/art/`
2. Add entry to `CARD_ID_TO_ART` in `client/src/game/utils/art/artMapping.ts`:
   ```typescript
   12345: '/art/abcd-12345678.webp',
   ```
3. That's it. `getCardArtPath()` will find it by ID.

### For Hero Art
1. Place `.webp` file in `client/public/art/`
2. Add/update entry in `HERO_ART_OVERRIDE`:
   ```typescript
   'hero-example': 'abcd-12345678',
   ```
3. `resolveHeroPortrait()` will find it.

### For King Art
1. Place `.png` or `.webp` file in `client/public/portraits/kings/`
2. Add `portrait` field to king config in `ChessPieceConfig.ts`:
   ```typescript
   portrait: '/portraits/kings/example.png',
   ```

---

## Art Template

See [ART_TEMPLATE.md](ART_TEMPLATE.md) for the standardized format for writing art prompts for the AI artist.

---

**Use THIS document (ART_STATUS.md) as the single source of truth.**
