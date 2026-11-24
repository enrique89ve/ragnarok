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
    campaign_nonce INTEGER DEFAULT 0,
    slashed BOOLEAN DEFAULT FALSE
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
    price NUMERIC(18, 6) NOT NULL,
    currency VARCHAR(8) NOT NULL, -- 'HIVE' | 'HBD'
    listed_block INTEGER,
    listed_trx_id VARCHAR(128),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS market_offers (
    offer_id VARCHAR(128) PRIMARY KEY,
    nft_uid VARCHAR(128) NOT NULL,
    buyer VARCHAR(16) NOT NULL REFERENCES players(username),
    price NUMERIC(18, 6) NOT NULL,
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

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at BIGINT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS runtime_meta (
    key VARCHAR(64) PRIMARY KEY,
    value_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    match_id VARCHAR(128) PRIMARY KEY,
    winner VARCHAR(16) NOT NULL,
    loser VARCHAR(16) NOT NULL,
    winner_elo_before INTEGER NOT NULL,
    winner_elo_after INTEGER NOT NULL,
    loser_elo_before INTEGER NOT NULL,
    loser_elo_after INTEGER NOT NULL,
    card_fingerprint TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    block_num INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS eitr_ledger (
    entry_id VARCHAR(256) PRIMARY KEY,
    season_id VARCHAR(32) NOT NULL,
    account VARCHAR(16) NOT NULL,
    direction VARCHAR(16) NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    source_key TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    trx_id VARCHAR(128),
    block_num INTEGER,
    timestamp BIGINT
);

CREATE TABLE IF NOT EXISTS forge_commits (
    trx_id VARCHAR(128) PRIMARY KEY,
    account VARCHAR(16) NOT NULL,
    rarity VARCHAR(32) NOT NULL,
    salt_commit TEXT NOT NULL,
    commit_block INTEGER NOT NULL,
    debit_amount INTEGER NOT NULL,
    revealed BOOLEAN DEFAULT FALSE,
    season_id VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS pack_commits (
    trx_id VARCHAR(128) PRIMARY KEY,
    account VARCHAR(16) NOT NULL,
    pack_type VARCHAR(32) NOT NULL,
    quantity INTEGER NOT NULL,
    salt_commit TEXT NOT NULL,
    commit_block INTEGER NOT NULL,
    revealed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pack_supply (
    pack_type VARCHAR(32) PRIMARY KEY,
    cap INTEGER NOT NULL DEFAULT 0,
    minted INTEGER NOT NULL DEFAULT 0,
    burned INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS campaign_submissions (
    submission_key VARCHAR(256) PRIMARY KEY,
    account VARCHAR(16) NOT NULL,
    campaign_id VARCHAR(64) NOT NULL,
    mission_id VARCHAR(64) NOT NULL,
    difficulty VARCHAR(16) NOT NULL,
    nonce INTEGER NOT NULL,
    local_run_id TEXT NOT NULL,
    local_started_at BIGINT NOT NULL,
    ruleset_hash TEXT NOT NULL,
    seed TEXT NOT NULL,
    turn_count INTEGER NOT NULL,
    stars INTEGER NOT NULL,
    transcript_root TEXT NOT NULL,
    transcript_cid TEXT,
    final_state_hash TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    rejection_reason TEXT,
    trx_id VARCHAR(128) NOT NULL,
    block_num INTEGER NOT NULL,
    timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_progress (
    progress_key VARCHAR(256) PRIMARY KEY,
    account VARCHAR(16) NOT NULL,
    campaign_id VARCHAR(64) NOT NULL,
    mission_id VARCHAR(64) NOT NULL,
    best_difficulty VARCHAR(16) NOT NULL,
    best_turns INTEGER NOT NULL,
    best_stars INTEGER NOT NULL,
    completed_at_block INTEGER NOT NULL,
    completed_trx_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'verified'
);

CREATE TABLE IF NOT EXISTS duat_claims (
    account VARCHAR(16) PRIMARY KEY,
    duat_raw BIGINT NOT NULL,
    packs_earned INTEGER NOT NULL,
    trx_id VARCHAR(128) NOT NULL,
    block_num INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_claims (
    claim_key VARCHAR(256) PRIMARY KEY,
    account VARCHAR(16) NOT NULL,
    reward_id VARCHAR(128) NOT NULL,
    claimed_at BIGINT NOT NULL,
    block_num INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS slashed_accounts (
    account VARCHAR(16) PRIMARY KEY,
    slashed_at BIGINT NOT NULL,
    reason TEXT,
    block_num INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS queue_entries (
    account VARCHAR(16) PRIMARY KEY,
    mode VARCHAR(32) NOT NULL,
    elo INTEGER NOT NULL,
    peer_id TEXT NOT NULL,
    deck_hash TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    block_num INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_owner ON cards(owner);
CREATE INDEX IF NOT EXISTS idx_packs_owner ON packs(owner);
CREATE INDEX IF NOT EXISTS idx_rune_ledger_account_season ON rune_ledger(account, season_id);
CREATE INDEX IF NOT EXISTS idx_eitr_ledger_account_season ON eitr_ledger(account, season_id);
CREATE INDEX IF NOT EXISTS idx_forge_commits_account ON forge_commits(account);
CREATE INDEX IF NOT EXISTS idx_forge_commits_revealed ON forge_commits(revealed);
CREATE INDEX IF NOT EXISTS idx_pack_commits_revealed ON pack_commits(revealed);
CREATE INDEX IF NOT EXISTS idx_market_listings_nft_uid ON market_listings(nft_uid);
CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller);
CREATE INDEX IF NOT EXISTS idx_market_offers_nft_uid ON market_offers(nft_uid);
CREATE INDEX IF NOT EXISTS idx_campaign_progress_lookup ON campaign_progress(account, campaign_id, mission_id);
