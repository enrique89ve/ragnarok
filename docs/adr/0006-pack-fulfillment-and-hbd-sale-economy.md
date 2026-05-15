# ADR 0006 - Pack fulfillment and HBD sale economy

**Status**: Accepted
**Date**: 2026-05-15
**Deciders**: enrique

## Context

Ragnarok sells and awards packs, but NFTLox does not administer packs. NFTLox
only births and distributes the resolved NFT instances. Pack type, price,
randomness, liquidity protection, and idempotency are Ragnarok protocol concerns.

The active pack tiers are `standard`, `premium`, and `mythic`. They should share
one fulfillment machine, with different parameters per tier:

- slot guarantees,
- wildcard upgrade odds,
- eligible card pools,
- per-card and per-rarity liquidity,
- sale caps,
- RUNE/HBD pricing.

RUNE pricing already exists for resettable testnet progression. The beta sale
model needs HBD reference prices that respect the full pack-cap grid while
allowing smaller 2M HBD or 500k HBD launch tranches.

## Decision

Define the HBD full-cap economy as **maximum primary gross receipts when all
configured sale caps sell out**. This is not a secondary-market market cap. A
2M HBD or 500k HBD sale is a tranche under the global caps, not a rewrite of
the full sale capacity.

Use fixed beta HBD prices:

```txt
standard = 20 HBD
premium  = 100 HBD
mythic   = 250 HBD
```

Use HBD thousandths as the storage unit. The beta HBD price grid is:

| Pack | Price |
|---|---:|
| Standard | 20.000 HBD |
| Premium | 100.000 HBD |
| Mythic | 250.000 HBD |

The full cap and launch-tranche scenarios are:

| Scenario | Standard cap | Premium cap | Mythic cap | Pack cap | Card instances | Gross HBD |
|---|---:|---:|---:|---:|---:|---:|
| `beta_full_cap` | 100,000 | 60,000 | 100,000 | 260,000 | 1,620,000 | 33,000,000 |
| `beta_2m_tranche` | 6,061 | 3,636 | 6,061 | 15,758 | 98,184 | 2,000,070 |
| `beta_500k_tranche` | 1,515 | 909 | 1,515 | 3,939 | 24,543 | 499,950 |

The tranche caps preserve the global pack mix and stay below the full-cap
capacity. Unsold global capacity remains available for later seasons, events,
or treasury-controlled sale waves.

## Fulfillment Contract

All pack sources converge on the same resolver:

```txt
pack trigger -> fulfillment id -> deterministic RNG -> resolved card seed ids -> NFTLox bulk_distribute
```

Required properties:

- Same resolver for Standard, Premium, Mythic.
- Different tier parameters from the canonical pack catalog.
- Idempotency key per economic event, for example
  `pack_sale:{chain}:{txId}:{account}:{packType}:{quantity}`.
- Resolved results are persisted before NFTLox broadcast.
- NFTLox retries must reuse the persisted result, never reroll.
- `bulk_distribute` receives only `{ seedId, quantity }` entries for the final
  card instances.

## HBD Payment Rules

HBD purchase is a separate channel from RUNE exchange.

- Buyer sends HBD to the configured treasury account.
- Memo identifies pack type, quantity, quote id, and price version.
- The fulfillment service validates the transfer amount against the active
  price version.
- Prices are admin-editable only by publishing a new version with an
  `activeFromBlock`; historical purchases keep their original quote.
- Database-only price edits are projections, not economic authority.

## How To Change Pack Prices

The single source of truth is `shared/protocol-core/packCatalog.ts`.

1. Change `BETA_HBD_PRICE_GRID`. Values are HBD thousandths:
   - `20_000` = `20.000 HBD`
   - `100_000` = `100.000 HBD`
   - `250_000` = `250.000 HBD`
2. If the active sale scenario changes, update
   `ACTIVE_HBD_PACK_SALE_SCENARIO_KEY`.
3. Recalculate tranche caps with the same pack mix if the target gross changes.
4. Update `shared/protocol-core/packCatalog.test.ts` expected totals.
5. Run `npm test -- shared/protocol-core/packCatalog.test.ts` and
   `npm run check`.

Frontend code must read prices through `getHbdPackPriceThousandths`,
`formatHbdThousandths`, or `formatHbdPrice`. Do not hardcode pack prices or
scenario keys in React components.

## Consequences

- `shared/protocol-core/packCatalog.ts` owns the scenario constants.
- UI may display HBD prices from the selected scenario, but must not repurpose
  the legacy `price` field silently.
- RUNE packs remain a gameplay sink; HBD packs are paid purchases. Both routes
  can share fulfillment, but they have independent caps and idempotency keys.
- NFTLox integration work should focus on `bulk_distribute`, not `pack_create`
  or `pack_open`.
