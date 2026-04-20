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
| **DUAT airdrop** | 30% | 822,295 | 164,459 |
| **In-game rewards** | 20% | 548,200 | 109,640 |
| **Pack sales** | 50% | 1,370,500 | 274,100 |
| **Total** | 100% | 2,741,000 | 548,200 |

---

## 4. Distribution Formula (Calibrated)

### Log-Linear with Binary Search Calibration

```
SCALE = 5.346668  (calibrated via binary search to hit 164,459 packs exactly)
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
| Total packs | 164,459 |
| Total cards | 822,295 |
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

```
1. User signs in via Hive Keychain
2. App loads frozen duat-snapshot.json (bundled, ~200KB)
3. Lookup: is username in snapshot?
4. If YES and not yet claimed:
   a. Gold popup: "DUAT Holder Detected!"
   b. Shows: DUAT balance, packs earned, days remaining
   c. "Claim Your Packs" button
   d. On click: broadcast duat_airdrop_claim via Keychain
   e. Replay engine validates + mints sealed packs
   f. Mark as claimed (IndexedDB + on-chain)
5. If already claimed: badge in account panel
6. If not in snapshot: no popup, normal login
7. "Maybe Later" dismisses until next session
```

---

## 7. Snapshot Integrity

```
1. scripts/freezeDuatSnapshot.mjs fetches live API
2. Filters: system accounts, <1 DUAT
3. Sorts by account name (canonical)
4. Computes: SHA-256 of canonical JSON
5. Outputs: client/public/data/duat-snapshot.json
6. Hash included in genesis broadcast payload
7. Replay engine verifies claims against this hash
```

The snapshot is frozen once and never changes. The on-chain hash prevents tampering.

---

## 8. Protocol Integration

### New Op: `duat_airdrop_claim`

- **Auth**: Posting key (user claims their own packs)
- **Payload**: `{ account, duat_balance, packs_earned }`
- **Validation**:
  1. Genesis exists with snapshot hash
  2. Account is in snapshot with matching balance
  3. Not already claimed
  4. Within 90-day claim window
  5. Pack count matches `calculateDuatPacks(balance)` formula
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
| `client/public/data/duat-snapshot.json` | Frozen snapshot (bundled with client) |
| `client/src/game/stores/duatClaimStore.ts` | Zustand store for claim state |
| `client/src/game/components/DuatClaimPopup.tsx` | Claim popup UI |

### Modified Files

| File | Changes |
|------|---------|
| `shared/protocol-core/types.ts` | +`duat_airdrop_claim`, +`duat_airdrop_finalize` actions, +DuatClaim type, +StateAdapter methods |
| `shared/protocol-core/normalize.ts` | +legacy mapping for claim ops |
| `shared/protocol-core/apply.ts` | +`applyDuatAirdropClaim`, +`applyDuatAirdropFinalize` handlers |
| `client/src/data/HiveSync.ts` | +`claimDuatAirdrop()` broadcast method |
| `client/src/data/blockchain/replayDB.ts` | +`duat_claims` store (v9) |
| `client/src/data/blockchain/clientStateAdapter.ts` | +duat claim adapter methods |
| `server/services/serverStateAdapter.ts` | +duat claim server methods |
| `client/src/App.tsx` | +DuatClaimPopup render on login |
| `client/src/data/blockchain/genesisAdmin.ts` | +snapshot hash in genesis payload |
