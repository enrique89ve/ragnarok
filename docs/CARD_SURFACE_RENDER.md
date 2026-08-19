# Card surface render — what appears on a card

Single source of truth for **which chrome is painted** on a mythos card by stage. When this doc and code diverge, **code wins**, then this file should be updated in the same change.

Keyword filter rules stay in `client/src/game/components/card/cardPresentationContract.ts`. This document covers **all slots**, not only keywords.

Related: [`POKER_ARENA_UI.md`](./POKER_ARENA_UI.md), [`ElementWeaknessSystem.md`](./ElementWeaknessSystem.md), [`RULEBOOK.md`](./RULEBOOK.md).

---

## Two card families

| Family | Renderer | Slots |
|---|---|---|
| Mythos (minion, spell, weapon, pet, secret) | `CardFrame` + `CollectionCardRenderer` / `SimpleCardCompat` | This document |
| Poker 52 (rank/suit) | `PokerCardFrame` | Rank + suit or face-down. **No** mythos chrome |

---

## Surfaces (stages)

| Stage | Presentation surface | Layout surface | Typical scene |
|---|---|---|---|
| Collection / inspection | `collection` | `collection`, `preview` | Collection, warband, deck builder |
| Before poker (pregame) | `pregame` | `mulligan` | Mulligan keep/swap |
| During combat / poker | `gameplay` | `gameplay` (hand), `compact` (small hand), `battlefield` (board) | Chess-poker match |

`cardFrameSurfaceToPresentationSurface` maps layout → presentation.

---

## Pocket map (mythos tile)

```
[ mana ]     [ blood | evolution ]     [ element ]
 top-left         top-center            top-right

              art window

[ keywords / description ]
[ ATK ]     [ name / tribe / rarity ]     [ HP ]
[ count / mint — collection only ]
```

Icons for chrome slots live in `client/src/game/components/ui/CardChromeIconsSVG.tsx` (same SVG contract as keyword icons in `CardIconsSVG.tsx`: 24×24, `currentColor`, 1em).

---

## Slot matrix

`R` = render on the card face. `H` = hover / detail panel only. `—` = do not paint. `*` = only if the card has the data.

| Slot | Icon | Collection | Pregame | Hand (`gameplay`/`compact`) | Battlefield | Poker 52 |
|---|---|---|---|---|---|---|
| Art | — | R | R | R | R | — (rank/suit instead) |
| Mana | gem + element glyph | R | R | R | R | — |
| Name | — | R | R | R (hidden on compact) | — | — |
| Keywords | `KEYWORD_ICON_MAP` | R (tile may omit; collection inspector lists all) + H | R, max 2, compact, **timing** set + H | R, max 2, **combat** set + H | R, max 2, symbols + H | — |
| Description | — | inspector / detail | H (`MulliganDetailPanel`) | H | H | — |
| Tribe | — | inspector | — | gameplay medium only | — | — |
| Attack | swords / stat badge | R* | R* | R* | R* | — |
| Health | heart / stat badge | R* | R* | R* | R* | — |
| Rarity | rarity mark | R + H | chrome only + H | chrome only + H | chrome only + H | — |
| Element badge | `ELEMENT_ICON_MAP` | R* (non-neutral) + H | R* + H | R* + H | R* + H | — |
| Blood Price | `CARD_CHROME_ICON_MAP.bloodPrice` | R* + H | R* + H | R* + H | R* + H | — |
| Evolution / pet stage | `CARD_CHROME_ICON_MAP.petStage` | R* + H | R* + H | R* + H | — | — |
| Collection count | — | R if count > 1 | — | — | — | — |
| Rank / suit | poker face | — | — | — | — | R + H |

Hover FAQ (`H`) for chrome marks uses `data-chrome-faq` + `<CardKeywordTooltip>`. Same copy appears in `MulliganDetailPanel` under **Card marks**. Poker 52 hover explains rank and Norse suit (Swords/Suns/Othala/Hammers).

LoL HUD rule: the FAQ docks outside the card (above a top mark, beside a center mark) and never follows the cursor. Inspecting a mark sets `data-chrome-inspecting` so the parent card does not lift over its neighbors.

`*` Attack/health require **both** values and a combat type (minion / weapon / artifact). Missing one uses the clean frame (no sockets).

---

## Keyword sets (short)

Full table: `CARD_KEYWORD_SEMANTICS` in `cardPresentationContract.ts`.

- **Pregame keeps timing:** Battlecry, Discover, Quest, Secret, Rush, Charge, Combo, Choose One, Corrupt, Overload, Wager, Poker Spell.
- **Gameplay keeps combat state:** Taunt, Divine Shield, Poisonous, Lifesteal, Stealth, Frozen, Immune, Windfury, Deathrattle, Aura, Wager.
- **Gameplay hides setup:** Battlecry, Discover, Quest, Secret, Combo, Magnetic.
- **Never on combat chrome:** `artifact`, `dual_class`, unclassified keywords.

---

## Element SVG set

Canonical keys: `fire | water | grass | electric | light | dark | ice | neutral`.

| Key | Band label | Stave | SVG |
|---|---|---|---|
| fire | Fire | Kenaz | `IconElementFire` |
| water | Water | Laguz | `IconElementWater` |
| grass | Earth | Othala | `IconElementGrass` |
| electric | Wind | Algiz | `IconElementElectric` |
| light | Holy | Sowilo | `IconElementLight` |
| dark | Shadow | Hagalaz | `IconElementDark` |
| ice | Ice | Isa | `IconElementIce` |
| neutral | Neutral | Ingwaz | `IconElementNeutral` (not painted as a badge) |

Marks are filled Elder Futhark silhouettes in `CardChromeIconsSVG.tsx`. Badge pocket is 21.6px × UI scale (10% under the previous 24px stave). Keyword rail type is 0.396rem (10% over the previous 0.36rem) so rules icons outweigh the corner pip, closer to a LoL ability-bar vs. role-icon balance. Band colors stay in `elementBand.ts`.

---

## Fit budget (current tokens)

Painted maximum, not registry length. Extra keywords become a `+N` overflow chip.

| Surface | Card width | Paint max | Chip mode | Rail width | Worst row | Fits? |
|---|---|---|---|---|---|---|
| Collection | 156 | **5** as 2+3 rows, else 1–4 | 18px symbols | ~141px | 3×18 + gaps ≈ 60px / row | Yes |
| Mulligan | 220 | 2 keywords + `+N`, 1 element, blood or pet | icon-only | ~205px | 3×~30 + gaps ≈ 98px | Yes |
| Hand compact | 132 | 2 keywords + `+N`, 1 element, blood or pet | icon-only | ~120px | 3×~30 + gaps ≈ 98px | Yes |
| Hand / board medium | 156 | 2 keywords + `+N`, 1 element | **full labels** | ~144px | 2× “Divine Shield” ≈ 175px | **Clips** |

Registry scan (1631 keyword arrays):

- Max keywords on one card: **5** (`Hephaestus`: magnetic, divine_shield, taunt, lifesteal, rush). One card has 4 (`Kari`). 63 have 3+.
- After surface filter, Hephaestus keeps 5 on collection (2+3 stack) and 4 combat keywords on gameplay (single row). Five painted keywords never use `+N`; they wrap **2 above / 3 below**.
- Element badges: **one** per card. Neutral is hidden.
- Top-center: live catalog never stacks blood + pet. Max observed chrome pair is **element + pet**. Blood cards are not elemental. Theoretical element + blood + pet still fits on 132px (~90px used).

Conclusion: the 21.6px stave and +10% keyword scale fit every surface **except gameplay full-label pairs**. Those two long names overflow the 156px rail and ellipsis. If that surface should stay as readable as collection symbols, switch gameplay to compact/icon-only like mulligan.

---

## Layout adapter flags

`resolveSimpleCardFrameLayoutAdapter`:

| Surface | name | keywords | element | blood | evolution | description |
|---|---|---|---|---|---|---|
| collection | yes | no (renderer may still list collection keywords) | yes | yes | yes | no on tile |
| mulligan | yes | yes, 2, compact | yes | yes | yes | no |
| gameplay | yes | yes, 2, full | yes | yes | yes | no |
| compact | no | yes, 2, compact | yes | yes | yes | no |
| battlefield | no | yes, 2, compact | yes | yes | **no** | no |

---

## Implementation map

| Concern | File |
|---|---|
| Slot importance per surface | `cardPresentationContract.ts` |
| Editor / default slot geometry | `cardLayoutDraft.ts` |
| Runtime show/hide flags | `cardFrameLayoutAdapter.ts` |
| Mount slots | `CollectionCardRenderer.tsx` |
| Gameplay/mulligan consumer | `SimpleCardCompat.tsx` |
| Keyword SVGs | `CardIconsSVG.tsx` |
| Element + chrome SVGs | `CardChromeIconsSVG.tsx` |
| Poker isolation | `cardSurfaceContract.css` |
