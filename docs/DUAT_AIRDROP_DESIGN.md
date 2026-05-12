# DUAT Holder Airdrop — Pack Distribution Design

**Status**: Implementing — calibrated against live data
**Date**: 2026-03-19
**Data source**: https://duat.ragnaroknft.quest/api/snapshot-data
**DUAT repo**: https://github.com/enrique89ve/duat-balance
**Calibration script**: `scripts/calibrateDuatAirdrop.mjs`

---

## 1. Overview

DUAT was a coupon-like token on Hive used by the original Ragnarok NFT project. Existing DUAT holders are entitled to **30% of the total NFT supply**, distributed as sealed card packs. Unclaimed packs after a 90-day window are absorbed into the treasury and sold as normal packs.

**Expected claim rate**: ~30-50% (many accounts are inactive). This is intentional — unclaimed packs fund the game economy.

---

## 2. Snapshot Data (Live, Verified)

| Metric | Value |
|--------|-------|
| Total DUAT supply | 75,035,822.145 |
| Eligible holders (≥1 DUAT) | 3,511 |
| System accounts excluded | ra, rc, rd, ri, rn, rm |
| Top holder | blocktrades (9,896,316 DUAT) |
| Median balance | ~400 DUAT |
| Smallest eligible | 1 DUAT |

### Distribution Histogram

| Balance Bracket | Holders | % |
|----------------|---------|---|
| 1 – 100 DUAT | 1,164 | 33.2% |
| 100 – 1K DUAT | 977 | 27.8% |
| 1K – 10K DUAT | 864 | 24.6% |
| 10K – 100K DUAT | 412 | 11.7% |
| 100K – 1M DUAT | 81 | 2.3% |
| 1M+ DUAT | 13 | 0.4% |

---

## 3. Supply Allocation

| Pool | Share | Cards | Packs (5-card standard) |
|------|-------|-------|------------------------|
| **DUAT airdrop** | 30% | 822,300 | 164,460 |
| **In-game rewards** | 20% | 548,200 | 109,640 |
| **Pack sales** | 50% | 1,370,500 | 274,100 |
| **Total** | 100% | 2,741,000 | 548,200 |

---

## 4. Distribution Formula (Calibrated)

### Log-Linear with Binary Search Calibration

```
SCALE = 5.346668  (calibrated via binary search to hit 164,460 packs exactly)
BASE_PACKS = 1
MAX_PACKS = 500
MIN_DUAT = 1.0 (display units)

packs = floor(min(MAX_PACKS, BASE_PACKS + log2(duatBalance) × SCALE))
```

### Verified Allocations (from live snapshot)

| Account | DUAT | Packs |
|---------|------|-------|
| blocktrades | 9,896,316 | 125 |
| alpha | 5,011,067 | 119 |
| steemmonsters | 3,718,523 | 117 |
| theycallmedan | 1,909,814 | 112 |
| themarkymark | 1,329,111 | 109 |
| median holder | ~400 | 47 |
| small holder | ~50 | 30 |
| minimum (1 DUAT) | 1 | 1 |

### Aggregate Stats

| Metric | Value |
|--------|-------|
| Total packs | 164,460 |
| Total cards | 822,300 |
| % of supply | **30.00%** |
| Average packs/holder | 46.8 |
| Median packs/holder | 47 |
| Min packs | 1 |
| Max packs | 125 |
| Holders with 0 packs | 0 |

---

## 5. Claim Window & Treasury Absorption

| Phase | Timing | Description |
|-------|--------|-------------|
| **Claim open** | Genesis day | DUAT holders can sign in and claim packs |
| **Claim deadline** | Genesis + 90 days (~2,592,000 blocks) | Last day to claim |
| **Treasury absorption** | Genesis + 91 days | Admin broadcasts `duat_airdrop_finalize` |

### Unclaimed Pack Projections

| Claim Rate | Packs Claimed | Packs → Treasury | Treasury Value |
|-----------|---------------|-------------------|----------------|
| 50% (optimistic) | ~82,000 | ~82,000 | Sold as normal packs |
| 30% (realistic) | ~49,000 | ~115,000 | Sold as normal packs |
| 10% (pessimistic) | ~16,000 | ~148,000 | Sold as normal packs |

All scenarios are healthy for the game economy. Active players get free packs, inactive DUAT becomes treasury revenue.

---

## 6. Claim Flow

### 6.1 Canonical flow (production target)

```
1. User signs in via Hive Keychain
2. App lazy-loads `@shared/protocol-core/duatSnapshot` only when a logged-in
   account needs an eligibility lookup or a DUAT replay op must be validated.
   The snapshot is public, but it is not part of the initial UI bundle.
3. Lookup: is username in snapshot?
4. If YES and not yet claimed:
   a. /packs renders the DuatClaimCard ("N sealed packs await", where
      N = calculateDuatPacks(entry.duatRaw))
   b. Optional first-session popup (DuatClaimPopup) on app load for discovery
   c. "Claim" button → unified `duatClaimStore.claimPacks()`:
      - broadcast `duat_airdrop_claim` via Keychain
      - records a local pending trx id for UX only
      - waits for client/server replay to record the canonical claim
   d. Server + client chain replay process the op via applyDuatAirdropClaim
   e. N sealed packs (uid prefix `duat_${trxId}:`) land in the player's vault
   f. Vault re-renders as "Standard ×N" tile in the sealed inventory grid
   g. Player opens each pack via the standard SealedPackTile "Open" action
5. If not in snapshot: card never shows, no popup
```

Both surfaces (popup and /packs banner) invoke the same store method. There is
no local pack mint and no separate claim source; until replay confirms the op,
the UI says "Claim submitted" / "Confirming" instead of showing openable packs.

Behavior:

- **Banner gated by replay state** — once the local replay DB has a DUAT claim,
  the /packs banner hides; if the broadcast is still pending, the banner remains
  as a confirmation state with the CTA disabled.
- **Click idempotent**: once a broadcast returns a trx id, the store will not
  submit another claim while that trx is pending.
- **No double-mint on chain**: `applyDuatAirdropClaim` rejects when
  `deps.state.getDuatClaim(account)` already exists, so even if the broadcast
  lands twice the second is dropped.
- **No exact balance in UX**: the UI shows eligibility and pack count. Raw DUAT
  balances stay in the public lazy snapshot/protocol validation path, not in
  default claim copy.
Production code path remains the canonical chain replay — no protocol-core
changes were made to support it.

---

## 7. Snapshot Integrity

```
1. scripts/freezeDuatSnapshot.mjs fetches live API
2. Filters: system accounts, <1 DUAT
3. Sorts by account name (canonical)
4. Strips derived fields — each holder persists only { account, duatRaw }
5. Computes: SHA-256 of canonical JSON (sans snapshotHash)
6. Outputs: shared/protocol-core/duatSnapshot.json (embedded in bundle)
7. Hash included in genesis broadcast payload
8. Replay engine verifies claims against this hash
```

The snapshot is frozen once and never changes. The on-chain hash prevents
tampering.

**Single source of truth for pack counts**: holder entries store ONLY
`{ account, duatRaw }`. Pack counts are derived at read time via
`calculateDuatPacks(duatRaw)` from `shared/protocol-core/types.ts`, which is
the same function `applyDuatAirdropClaim` uses to validate broadcast payloads.
`shared/protocol-core/duatSnapshot.ts` runs a boot-time assertion that
`Σ calculateDuatPacks(duatRaw) === stats.totalPacks` — the module throws on
load if the formula and stats drift apart.

---

## 8. Protocol Integration

### New Op: `duat_airdrop_claim`

- **Auth**: Posting key (user claims their own packs)
- **Payload**: `{ action: "duat_airdrop_claim" }`
  - Legacy clients may include `duat_balance` / `packs_earned`; replay accepts
    them only if they match the canonical snapshot-derived entitlement.
- **Validation**:
  1. Genesis exists with snapshot hash
  2. Account is in snapshot
  3. Not already claimed
  4. Within 90-day claim window
  5. Pack count is derived from `calculateDuatPacks(balance)` formula
- **Effect**: Mints N sealed standard packs to claimer

### New Op: `duat_airdrop_finalize` (admin-only)

- **Auth**: Active key (@ragnarok only)
- **Payload**: `{}`
- **Validation**: Past claim deadline block
- **Effect**: Marks airdrop as finalized, unclaimed packs credited to treasury

---

## 9. Implementation Files

### New Files

| File | Purpose |
|------|---------|
| `scripts/freezeDuatSnapshot.mjs` | Fetch + freeze + hash snapshot |
| `scripts/testDuatClaim.mjs` | Snapshot integrity tests (run via `node scripts/testDuatClaim.mjs`) |
| `shared/protocol-core/duatSnapshot.json` | Frozen snapshot (embedded in protocol bundle, imported by client + server) |
| `shared/protocol-core/duatSnapshot.ts` | Typed accessor module: `lookupDuatSnapshot`, `getDuatPacksFor`, boot-time integrity assertion |
| `client/src/game/stores/duatClaimStore.ts` | Zustand store + unified `claimPacks()` handler (lazy eligibility lookup + broadcast + pending UX state) |
| `client/src/game/components/DuatClaimPopup.tsx` | Claim popup UI |

### Modified Files

| File | Changes |
|------|---------|
| `shared/protocol-core/types.ts` | +`duat_airdrop_claim`, +`duat_airdrop_finalize` actions, +DuatClaim type, +StateAdapter methods, +`calculateDuatPacks`, +`DUAT_SCALE` / `DUAT_BASE_PACKS` / `DUAT_MAX_PACKS` constants |
| `shared/protocol-core/normalize.ts` | +legacy mapping for claim ops |
| `shared/protocol-core/apply.ts` | +`applyDuatAirdropClaim`, +`applyDuatAirdropFinalize` handlers (validates through injected DUAT entitlement provider) |
| `client/src/data/HiveSync.ts` | +`claimDuatAirdrop()` broadcast method |
| `client/src/data/blockchain/clientDuatEntitlementProvider.ts` | Lazy-loads public DUAT snapshot only when replaying/checking a DUAT claim |
| `client/src/data/blockchain/replayDB.ts` | +`duat_claims` store (v9) |
| `client/src/data/blockchain/clientStateAdapter.ts` | +duat claim adapter methods |
| `server/services/serverStateAdapter.ts` | +duat claim server methods |
| `client/src/App.tsx` | +DuatClaimPopup render on login |
| `client/src/data/blockchain/genesisAdmin.ts` | +snapshot hash in genesis payload |
| `client/src/game/components/packs/PacksPage.tsx` | DuatClaimCard wired to unified store handler, banner gated by replay/pending state |
| `client/src/game/components/wallet/WalletDuatClaim.tsx` | Wallet chip shows claimable pack count without raw DUAT balance copy |
| `client/src/data/blockchain/replayEngine.ts` | `hydrateStore` now loads packs from IDB (`getPacksByOwner`) — previously only cards/matches/balance/ELO. Without this fix the chain-replayed DUAT packs never reached the Zustand store. `forceSync` exposed on `globalThis.__ragnarokForceSync` for testnet diagnostics. |
