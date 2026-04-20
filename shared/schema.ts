import { pgTable, text, serial, integer, boolean, timestamp, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Think Tools Session Model
export const thinkToolsSessions = pgTable("think_tools_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  query: text("query").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reasoning Results Model
export const reasoningResults = pgTable("reasoning_results", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => thinkToolsSessions.id, { onDelete: 'cascade' }),
  reasoningMode: text("reasoning_mode").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reasoning Metrics Model
export const reasoningMetrics = pgTable("reasoning_metrics", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => thinkToolsSessions.id, { onDelete: 'cascade' }),
  reasoningMode: text("reasoning_mode").notNull(),
  durationMs: integer("duration_ms"),
  stepsCount: integer("steps_count"),
  insightsCount: integer("insights_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert Schemas
export const insertSessionSchema = createInsertSchema(thinkToolsSessions).pick({
  userId: true,
  title: true,
  query: true,
});

export const insertResultSchema = createInsertSchema(reasoningResults).pick({
  sessionId: true,
  reasoningMode: true,
  content: true,
  orderIndex: true,
});

export const insertMetricsSchema = createInsertSchema(reasoningMetrics).pick({
  sessionId: true,
  reasoningMode: true,
  durationMs: true,
  stepsCount: true,
  insightsCount: true,
});

// Types
export type ThinkToolsSession = typeof thinkToolsSessions.$inferSelect;
export type InsertThinkToolsSession = z.infer<typeof insertSessionSchema>;

export type ReasoningResult = typeof reasoningResults.$inferSelect;
export type InsertReasoningResult = z.infer<typeof insertResultSchema>;

export type ReasoningMetric = typeof reasoningMetrics.$inferSelect;
export type InsertReasoningMetric = z.infer<typeof insertMetricsSchema>;

// ============================================
// NFT Pack System Tables
// ============================================

// Rarity enum for NFT scarcity tiers
export const nftRarityEnum = ['basic', 'common', 'rare', 'epic', 'mythic'] as const;
export type NftRarity = typeof nftRarityEnum[number];

// Card Supply - tracks max and remaining supply for each card
export const cardSupply = pgTable("card_supply", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull().unique(), // References the in-game card ID
  cardName: text("card_name").notNull(),
  nftRarity: text("nft_rarity").notNull(), // common, rare, epic, mythic
  maxSupply: integer("max_supply").notNull(), // Absolute max ever minted
  remainingSupply: integer("remaining_supply").notNull(), // How many left to pull
  rewardReserve: integer("reward_reserve").notNull().default(0), // 20% held back for in-game rewards
  cardType: text("card_type").notNull(), // minion, spell, weapon, hero
  heroClass: text("hero_class").notNull(), // neutral, warrior, mage, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// User Inventory - tracks owned cards per user
export const userInventory = pgTable("user_inventory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  cardId: integer("card_id").notNull(), // References card_supply.cardId
  quantity: integer("quantity").notNull().default(1),
  mintNumber: integer("mint_number"), // Serial # of first copy pulled (null for legacy)
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

// Pack Types - different pack configurations available
export const packTypes = pgTable("pack_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // "Starter Pack", "Booster Pack", "Premium Pack"
  description: text("description"),
  cardCount: integer("card_count").notNull().default(9), // Cards per pack
  price: integer("price").notNull(), // In-game currency or cents
  commonSlots: integer("common_slots").notNull().default(5),
  rareSlots: integer("rare_slots").notNull().default(2),
  epicSlots: integer("epic_slots").notNull().default(1),
  wildcardSlots: integer("wildcard_slots").notNull().default(1), // Can upgrade to legendary/mythic
  legendaryChance: integer("legendary_chance").notNull().default(10), // % chance wildcard upgrades
  mythicChance: integer("mythic_chance").notNull().default(1), // % chance wildcard upgrades
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pack History - audit trail for all pack openings
export const packHistory = pgTable("pack_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"), // Optional: for payment tracking
  userId: integer("user_id").references(() => users.id).notNull(),
  packTypeId: integer("pack_type_id").references(() => packTypes.id).notNull(),
  cardsReceived: text("cards_received").notNull(), // JSON array of card IDs
  openedAt: timestamp("opened_at").defaultNow(),
});

// Insert Schemas for Pack System
export const insertCardSupplySchema = createInsertSchema(cardSupply).pick({
  cardId: true,
  cardName: true,
  nftRarity: true,
  maxSupply: true,
  remainingSupply: true,
  rewardReserve: true,
  cardType: true,
  heroClass: true,
});

export const insertUserInventorySchema = createInsertSchema(userInventory).pick({
  userId: true,
  cardId: true,
  quantity: true,
});

export const insertPackTypeSchema = createInsertSchema(packTypes).pick({
  name: true,
  description: true,
  cardCount: true,
  price: true,
  commonSlots: true,
  rareSlots: true,
  epicSlots: true,
  wildcardSlots: true,
  legendaryChance: true,
  mythicChance: true,
  isActive: true,
});

export const insertPackHistorySchema = createInsertSchema(packHistory).pick({
  userId: true,
  packTypeId: true,
  cardsReceived: true,
});

// Types for Pack System
export type CardSupply = typeof cardSupply.$inferSelect;
export type InsertCardSupply = z.infer<typeof insertCardSupplySchema>;

export type UserInventory = typeof userInventory.$inferSelect;
export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;

export type PackType = typeof packTypes.$inferSelect;
export type InsertPackType = z.infer<typeof insertPackTypeSchema>;

export type PackHistory = typeof packHistory.$inferSelect;
export type InsertPackHistory = z.infer<typeof insertPackHistorySchema>;

// ============================================
// Treasury Multisig Tables
// ============================================

export const treasurySigners = pgTable("treasury_signers", {
	id: serial("id").primaryKey(),
	username: text("username").notNull().unique(),
	status: text("status").notNull().default("active"),
	weight: integer("weight").notNull().default(1),
	joinedAt: timestamp("joined_at").defaultNow(),
	leftAt: timestamp("left_at"),
	cooldownUntil: timestamp("cooldown_until"),
	lastHeartbeat: timestamp("last_heartbeat"),
	optEvents: integer("opt_events").notNull().default(0),
});

export const treasuryVouches = pgTable("treasury_vouches", {
	id: serial("id").primaryKey(),
	voucherUsername: text("voucher_username").notNull(),
	candidateUsername: text("candidate_username").notNull(),
	voucherRankAtVouch: integer("voucher_rank_at_vouch"),
	active: boolean("active").notNull().default(true),
	revokeReason: text("revoke_reason"),
	createdAt: timestamp("created_at").defaultNow(),
	revokedAt: timestamp("revoked_at"),
});

export const treasuryTransactions = pgTable("treasury_transactions", {
	id: text("id").primaryKey(),
	txType: text("tx_type").notNull(),
	status: text("status").notNull().default("pending"),
	threshold: integer("threshold").notNull(),
	signatures: text("signatures").notNull().default("{}"),
	digestHex: text("digest_hex").notNull(),
	txObject: text("tx_object").notNull(),
	broadcastAfter: timestamp("broadcast_after"),
	broadcastTxId: text("broadcast_tx_id"),
	broadcastBlockNum: integer("broadcast_block_num"),
	metadata: text("metadata").notNull().default("{}"),
	createdAt: timestamp("created_at").defaultNow(),
	broadcastedAt: timestamp("broadcasted_at"),
	failureReason: text("failure_reason"),
});

export const treasuryAuditLog = pgTable("treasury_audit_log", {
	id: serial("id").primaryKey(),
	txId: text("tx_id").notNull(),
	action: text("action").notNull(),
	username: text("username"),
	rejectReason: text("reject_reason"),
	anomalyFlags: text("anomaly_flags"),
	metadata: text("metadata"),
	createdAt: timestamp("created_at").defaultNow(),
});

export const treasuryFreezeState = pgTable("treasury_freeze_state", {
	id: serial("id").primaryKey(),
	frozen: boolean("frozen").notNull().default(false),
	frozenBy: text("frozen_by"),
	frozenAt: timestamp("frozen_at"),
	unfreezeVotes: text("unfreeze_votes").notNull().default("[]"),
	unfreezeThreshold: integer("unfreeze_threshold"),
	reason: text("reason"),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export type TreasurySigner = typeof treasurySigners.$inferSelect;
export type TreasuryVouch = typeof treasuryVouches.$inferSelect;
export type TreasuryTransaction = typeof treasuryTransactions.$inferSelect;
export type TreasuryAuditLogEntry = typeof treasuryAuditLog.$inferSelect;
export type TreasuryFreezeStateRow = typeof treasuryFreezeState.$inferSelect;
