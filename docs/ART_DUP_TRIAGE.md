# 21-Pair Duplicate Art Triage

Generated automatically. For each pair, one card keeps the art (winner = lower id), the other(s) become pending.

| # | hash | winner card | winner art | loser card | loser art | will-delete |
|---|------|-------------|------------|------------|-----------|-------------|
| 1 | 53335686c9f0 | 111 Berserker Thrall | 3676-6ccb4f95 | 33112 Drakonid Operative | 5333-5686c9f0 (fp) | 5333-5686c9f0.webp |
| 2 | 4b23ec55818a | 115 Jotunn Axeman | e71e-f4d9ab88 | 7510 Bear of Bjorn | 4b23-ec55818a (fp) | 4b23-ec55818a.webp |
| 3 | 428bd2df7836 | 119 Battle Rage | ddd2-719cfa1c | 3020 Draugr Bones | 428b-d2df7836 (fp) | 428b-d2df7836.webp |
| 4 | b9b6efc5b4f0 | 120 Temple Healer | 60ee-93747180 | 33109 Hungry Wyrm of Jormungandr | b9b6-efc5b4f0 (fp) | b9b6-efc5b4f0.webp |
| 5 | 65fadea4d1e5 | 121 Asgard Cleric | 5da2-f09b7b58 | 32101 Deckhand of Njord | 65fa-dea4d1e5 (fp) | 65fa-dea4d1e5.webp |
| 6 | 409602da5c5c | 124 Norn\ | 11c2-b04b497e | 33038 Smith of Nidavellir | 4096-02da5c5c (fp) | 4096-02da5c5c.webp |
| 7 | ad5b86b64451 | 125 Guardian of the Well | 1acf-a8e33b4e | 8504 Acolyte of Valhalla | ad5b-86b64451 (fp) | ad5b-86b64451.webp |
| 8 | a0c856f62e78 | 128 Healing Light | 628c-d6b2f421 | 11049 ? | a0c8-56f62e78 (fp) | a0c8-56f62e78.webp |
| 9 | 5e2aab09482d | 134 Shadow Stalker | 2d95-fab9b203 | 33034 Acolyte of Hestia | 5e2a-ab09482d (fp) | 5e2a-ab09482d.webp |
| 10 | 54059fcb7860 | 9118 Hunter of Artemis | 5405-9fcb7860 (fp) | 95310 ? | 0a23-b08dbb07 | 5405-9fcb7860.webp (winner re-points to 0a23-b08dbb07) |
| 11 | 34377c37cdc0 | 19008 Bone Wraith | 3437-7c37cdc0 (fp) | 95067 ? | c088-ad2fc9ed | 3437-7c37cdc0.webp (winner re-points to c088-ad2fc9ed) |
| 12 | f6a2b0ca36b6 | 30074 Craftsman of Nidavellir | f6a2-b0ca36b6 (fp) | 95222 ? | 8a4c-cce5ff2f | f6a2-b0ca36b6.webp (winner re-points to 8a4c-cce5ff2f) |
| 13 | 35e3f4c7cd19 | 30090 Resting Archer of Ullr | 35e3-f4c7cd19 (fp) | 96015 ? | 1913-79012baf | 35e3-f4c7cd19.webp (winner re-points to 1913-79012baf) |
| 14 | 77e713d6dd86 | 31952 Oathsworn of Valhalla | 77e7-13d6dd86 (fp) | 95102 ? | e17d-219031e7 | 77e7-13d6dd86.webp (winner re-points to e17d-219031e7) |
| 15 | 7d527a8fa469 | 32064 Echidna, Mother of Dragons | 7d52-7a8fa469 (fp) | 95236 ? | 51ef-78ec62cf | 7d52-7a8fa469.webp (winner re-points to 51ef-78ec62cf) |
| 16 | a0026e297461 | 33039 High Priest of Hades | a002-6e297461 (fp) | 96008 ? | 1f0d-0f9971c1 | a002-6e297461.webp (winner re-points to 1f0d-0f9971c1) |
| 17 | 767a9151971e | 33107 Corruptor of Tartarus | 767a-9151971e (fp) | 95239 ? | 57a9-cf7b8e9f | 767a-9151971e.webp (winner re-points to 57a9-cf7b8e9f) |
| 18 | fd49d0f6c3cc | 33110 Mnemosyne the Chronicler | fd49-d0f6c3cc (fp) | 39011 ? | 556e-5fd736ca | fd49-d0f6c3cc.webp (winner re-points to 556e-5fd736ca) |
| 19 | ecdad33ad1b0 | 33242 Abyssal Enforcer | ecda-d33ad1b0 (fp) | 95315 ? | 1b3d-55710b9d | ecda-d33ad1b0.webp (winner re-points to 1b3d-55710b9d) |
| 20 | ec7d2ab0ba30 | 33243 Brawler of Valhalla | ec7d-2ab0ba30 (fp) | 95423 ? | 87e9-07f113f9 | ec7d-2ab0ba30.webp (winner re-points to 87e9-07f113f9) |
| 21 | b0fcf35fc98c | 92010 Drake of Midgard Sky | b0fc-f35fc98c (fp) | 96006 ? | 9783-a29f0b94 | b0fc-f35fc98c.webp (winner re-points to 9783-a29f0b94) |

## Action plan

1. Remove the loser cardId entries from `ART_REGISTRY` in `client/src/game/utils/art/artMapping.ts`.
2. Add the loser cardIds to `scripts/pending-art.json` so audit downgrades them from error to info.
3. Delete the duplicate `.webp` files listed above (or `git mv` to `art/orphaned/` if you want to preserve).
4. Run `npm run gen:collections` to regenerate manifests, then `npm run audit:art -- --strict`.
