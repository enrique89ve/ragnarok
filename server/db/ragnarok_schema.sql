-- Ragnarok Protocol - Production Database Schema (PostgreSQL)
-- This schema matures the JSON-based state into a relational model.

-- 1. Players and ELO
CREATE TABLE IF NOT EXISTS players (
    username VARCHAR(16) PRIMARY KEY,
    elo INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    last_match_at BIGINT,
    nonce INTEGER DEFAULT 0,
    campaign_nonce INTEGER DEFAULT 0
);

-- 2. Cards (NFT Assets)
CREATE TABLE IF NOT EXISTS cards (
    uid VARCHAR(128) PRIMARY KEY,
    card_id INTEGER NOT NULL,
    owner VARCHAR(16) NOT NULL REFERENCES players(username),
    rarity VARCHAR(32) NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    edition VARCHAR(32) DEFAULT 'alpha',
    foil VARCHAR(32),
    mint_source VARCHAR(32),
    mint_trx_id VARCHAR(128),
    mint_block_num INTEGER,
    last_transfer_block INTEGER,
    origin_dna TEXT,
    instance_dna TEXT,
    parent_instance_dna TEXT,
    generation INTEGER DEFAULT 0,
    replica_count INTEGER DEFAULT 0,
    merged_from TEXT[], -- Array of UIDs
    acquisition JSONB
);

-- 3. Packs (Pack Assets)
CREATE TABLE IF NOT EXISTS packs (
    uid VARCHAR(128) PRIMARY KEY,
    pack_type VARCHAR(32) NOT NULL,
    dna TEXT NOT NULL,
    owner VARCHAR(16) NOT NULL REFERENCES players(username),
    sealed BOOLEAN DEFAULT TRUE,
    mint_trx_id VARCHAR(128),
    mint_block_num INTEGER,
    last_transfer_block INTEGER,
    card_count INTEGER DEFAULT 5,
    edition VARCHAR(32) DEFAULT 'alpha',
    acquisition JSONB
);

-- 4. Rune Economy Ledger
CREATE TABLE IF NOT EXISTS rune_ledger (
    entry_id VARCHAR(256) PRIMARY KEY,
    season_id VARCHAR(32) NOT NULL,
    account VARCHAR(16) NOT NULL REFERENCES players(username),
    direction VARCHAR(16) NOT NULL, -- 'credit' | 'debit'
    source_type VARCHAR(64) NOT NULL,
    source_key TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    trx_id VARCHAR(128),
    block_num INTEGER,
    timestamp BIGINT
);

-- 5. Match History & Anchors
CREATE TABLE IF NOT EXISTS match_anchors (
    match_id VARCHAR(128) PRIMARY KEY,
    player_a VARCHAR(16) NOT NULL REFERENCES players(username),
    player_b VARCHAR(16) NOT NULL REFERENCES players(username),
    pubkey_a TEXT,
    pubkey_b TEXT,
    deck_hash_a TEXT,
    deck_hash_b TEXT,
    engine_hash TEXT,
    card_registry_hash TEXT,
    dual_anchored BOOLEAN DEFAULT FALSE,
    timestamp BIGINT
);

-- 6. Marketplace (Listings and Offers)
CREATE TABLE IF NOT EXISTS market_listings (
    listing_id VARCHAR(128) PRIMARY KEY,
    nft_uid VARCHAR(128) NOT NULL,
    nft_type VARCHAR(16) NOT NULL, -- 'card' | 'pack'
    seller VARCHAR(16) NOT NULL REFERENCES players(username),
    price INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL, -- 'HIVE' | 'HBD'
    listed_block INTEGER,
    listed_trx_id VARCHAR(128),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS market_offers (
    offer_id VARCHAR(128) PRIMARY KEY,
    nft_uid VARCHAR(128) NOT NULL,
    buyer VARCHAR(16) NOT NULL REFERENCES players(username),
    price INTEGER NOT NULL,
    currency VARCHAR(8) NOT NULL,
    offered_block INTEGER,
    offered_trx_id VARCHAR(128),
    status VARCHAR(32) DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected' | 'expired'
    payment_trx_id VARCHAR(128)
);

-- 7. Sync Progress & Global State
CREATE TABLE IF NOT EXISTS global_sync (
    key VARCHAR(64) PRIMARY KEY, -- 'block_cursor'
    value_int BIGINT,
    value_text TEXT
);

-- 8. Supply Counters
CREATE TABLE IF NOT EXISTS supply_counters (
    key VARCHAR(128) PRIMARY KEY, -- 'pack:starter'
    pool VARCHAR(16) NOT NULL,
    cap INTEGER NOT NULL,
    minted INTEGER DEFAULT 0
);
