/**
 * Pack Routes
 *
 * Endpoints for pack types, supply stats, and pack opening.
 */

import express, { Request, Response } from 'express';
import { directDb as _directDb } from '../db';
import { verifyHiveAuth, isValidHiveUsername, isTimestampFresh } from '../services/hiveAuth';

// This file is only imported when DATABASE_URL is set (see server/routes.ts)
const directDb = _directDb!;

const router = express.Router();

interface PackTypeRow {
	id: number;
	name: string;
	common_slots: number;
	rare_slots: number;
	epic_slots: number;
	wildcard_slots: number;
	legendary_chance: number | null;
	mythic_chance: number | null;
}

interface CardSupplyRow {
	id: number;
	card_id: number;
	card_name: string;
	nft_rarity: string;
	max_supply: number;
	remaining_supply: number;
	reward_reserve: number;
	card_type: string;
	hero_class: string;
}

interface PackHistoryCardRecord {
	cardId: number;
	mintNumber: number;
	nftRarity: string;
	cardType: string;
	heroClass: string;
}

// In-memory TTL cache for read-heavy endpoints
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
	const entry = cache.get(key);
	if (entry && Date.now() < entry.expiry) return Promise.resolve(entry.data as T);
	return fetcher().then(data => {
		cache.set(key, { data, expiry: Date.now() + ttlMs });
		return data;
	});
}

const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;

/**
 * GET /api/packs/types
 * Returns all active pack types (cached 5 min)
 */
router.get('/types', async (_req: Request, res: Response) => {
	try {
		const packs = await getCached('pack-types', FIVE_MINUTES, async () => {
			const result = await directDb.query(`
				SELECT * FROM pack_types WHERE is_active = true ORDER BY price ASC
			`);
			return result.rows;
		});

		res.json({ success: true, packs });
	} catch (error: any) {
		console.error('Error fetching pack types:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch pack types' });
	}
});

/**
 * GET /api/packs/supply-stats
 * Returns summary stats (cached 30s)
 */
router.get('/supply-stats', async (_req: Request, res: Response) => {
	try {
		const stats = await getCached('supply-stats', THIRTY_SECONDS, async () => {
			const overallStats = await directDb.query(`
				SELECT
					COUNT(*) as total_cards,
					SUM(max_supply) as total_max_supply,
					SUM(remaining_supply) as total_remaining_supply,
					SUM(reward_reserve) as total_reward_reserve,
					SUM(max_supply - reward_reserve) as total_pack_supply,
					SUM(GREATEST(remaining_supply - reward_reserve, 0)) as total_pack_remaining
				FROM card_supply
			`);

			const rarityStats = await directDb.query(`
				SELECT
					nft_rarity,
					COUNT(*) as card_count,
					SUM(max_supply) as max_supply,
					SUM(remaining_supply) as remaining_supply,
					SUM(reward_reserve) as reward_reserve,
					SUM(max_supply - reward_reserve) as pack_supply,
					SUM(GREATEST(remaining_supply - reward_reserve, 0)) as pack_remaining
				FROM card_supply
				GROUP BY nft_rarity
				ORDER BY
					CASE nft_rarity
						WHEN 'mythic' THEN 1
						WHEN 'epic' THEN 2
						WHEN 'rare' THEN 3
						WHEN 'common' THEN 4
					END
			`);

			const typeStats = await directDb.query(`
				SELECT
					card_type,
					COUNT(*) as card_count,
					SUM(max_supply) as max_supply,
					SUM(remaining_supply) as remaining_supply,
					SUM(reward_reserve) as reward_reserve,
					SUM(max_supply - reward_reserve) as pack_supply,
					SUM(GREATEST(remaining_supply - reward_reserve, 0)) as pack_remaining
				FROM card_supply
				GROUP BY card_type
			`);

			return {
				overall: overallStats.rows[0],
				byRarity: rarityStats.rows,
				byType: typeStats.rows,
			};
		});

		res.json({ success: true, ...stats });
	} catch (error: any) {
		console.error('Error fetching supply stats:', error);
		res.status(500).json({ success: false, error: 'Failed to fetch supply stats' });
	}
});

// Type cycling patterns for slot diversity
const COMMON_TYPES = ['minion', 'spell'];
const RARE_TYPES = ['minion', 'spell'];
const WILDCARD_TYPES = ['hero', 'spell', 'minion'];

function seedToUint32(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) || 1;
}

function createDeterministicRng(seed: string): () => number {
	let state = seedToUint32(seed);
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

function getMintNumber(card: CardSupplyRow): number {
	return card.max_supply - card.remaining_supply;
}

function buildHistoryRecord(card: CardSupplyRow): PackHistoryCardRecord {
	return {
		cardId: card.card_id,
		mintNumber: getMintNumber(card),
		nftRarity: card.nft_rarity,
		cardType: card.card_type,
		heroClass: card.hero_class,
	};
}

/**
 * POST /api/packs/open
 * Opens a pack and returns the cards pulled
 */
router.post('/open', async (req: Request, res: Response) => {
	const { packTypeId, userId, signature, timestamp } = req.body;

	if (!packTypeId || !userId) {
		return res.status(400).json({
			success: false,
			error: 'packTypeId and userId are required'
		});
	}

	if (!isValidHiveUsername(userId)) {
		return res.status(400).json({ success: false, error: 'Invalid username format' });
	}

	if (!signature || !timestamp) {
		return res.status(401).json({ success: false, error: 'Signature and timestamp are required' });
	}
	if (!isTimestampFresh(timestamp)) {
		return res.status(401).json({ success: false, error: 'Stale timestamp' });
	}
	const message = `ragnarok-pack-open:${userId}:${packTypeId}:${timestamp}`;
	const authResult = await verifyHiveAuth(userId, message, signature);
	if (!authResult.valid) {
		return res.status(401).json({ success: false, error: 'Invalid signature' });
	}

	const client = await directDb.connect();

	try {
		await client.query('BEGIN');

		const packResult = await client.query(`
			SELECT * FROM pack_types WHERE id = $1 AND is_active = true FOR UPDATE
		`, [packTypeId]);

		if (packResult.rows.length === 0) {
			await client.query('ROLLBACK');
			return res.status(404).json({ success: false, error: 'Pack type not found or inactive' });
		}

		const pack = packResult.rows[0] as PackTypeRow;
		const pulledCards: CardSupplyRow[] = [];
		const historyInsert = await client.query(`
			INSERT INTO pack_history (user_id, pack_type_id, cards_received)
			VALUES ($1, $2, $3)
			RETURNING id
		`, [userId, packTypeId, '[]']);
		const historyId = historyInsert.rows[0]?.id as number | undefined;
		if (!historyId) {
			throw new Error('Failed to allocate pack history row');
		}
		const openingSeed = `${userId}:${packTypeId}:${historyId}`;

		const rarityFallback: Record<string, string[]> = {
			common: ['common', 'rare', 'epic', 'mythic'],
			rare: ['rare', 'epic', 'mythic'],
			epic: ['epic', 'mythic'],
			mythic: ['mythic', 'epic'],
		};

		async function claimDeterministicCard(
			rarity: string,
			slotSeed: string,
			preferredType?: string,
		): Promise<CardSupplyRow | null> {
			const result = preferredType
				? await client.query(`
					SELECT * FROM card_supply
					WHERE nft_rarity = $1 AND card_type = $2 AND remaining_supply > reward_reserve
					ORDER BY md5($3 || ':' || card_id::text), card_id ASC
					LIMIT 1
					FOR UPDATE SKIP LOCKED
				`, [rarity, preferredType, slotSeed])
				: await client.query(`
					SELECT * FROM card_supply
					WHERE nft_rarity = $1 AND remaining_supply > reward_reserve
					ORDER BY md5($2 || ':' || card_id::text), card_id ASC
					LIMIT 1
					FOR UPDATE SKIP LOCKED
				`, [rarity, slotSeed]);

			const card = result.rows[0] as CardSupplyRow | undefined;
			if (!card) return null;

			const updated = await client.query(`
				UPDATE card_supply
				SET remaining_supply = remaining_supply - 1
				WHERE id = $1 AND remaining_supply > reward_reserve
				RETURNING *
			`, [card.id]);
			return (updated.rows[0] as CardSupplyRow | undefined) ?? null;
		}

		async function pullCard(nftRarity: string, slotSeed: string, preferredType?: string): Promise<CardSupplyRow | null> {
			const fallbackOrder = rarityFallback[nftRarity] || [nftRarity];

			for (const rarity of fallbackOrder) {
				if (preferredType) {
					const typedCard = await claimDeterministicCard(rarity, `${slotSeed}:preferred`, preferredType);
					if (typedCard) return typedCard;
				}

				const card = await claimDeterministicCard(rarity, `${slotSeed}:any`);
				if (card) return card;
			}

			return null;
		}

		function determineWildcardRarity(slotSeed: string, mythicChance: number): string {
			const roll = createDeterministicRng(`wildcard:${slotSeed}`)() * 100;
			if (roll < mythicChance) return 'mythic';
			if (roll < mythicChance + 20) return 'epic';
			return 'rare';
		}

		for (let i = 0; i < pack.common_slots; i++) {
			const preferredType = COMMON_TYPES[i % COMMON_TYPES.length];
			const card = await pullCard('common', `${openingSeed}:common:${i}`, preferredType);
			if (!card) throw new Error(`Insufficient supply for common slot ${i + 1}`);
			pulledCards.push(card);
		}

		for (let i = 0; i < pack.rare_slots; i++) {
			const preferredType = RARE_TYPES[i % RARE_TYPES.length];
			const card = await pullCard('rare', `${openingSeed}:rare:${i}`, preferredType);
			if (!card) throw new Error(`Insufficient supply for rare slot ${i + 1}`);
			pulledCards.push(card);
		}

		for (let i = 0; i < pack.epic_slots; i++) {
			const card = await pullCard('epic', `${openingSeed}:epic:${i}`, 'spell');
			if (!card) throw new Error(`Insufficient supply for epic slot ${i + 1}`);
			pulledCards.push(card);
		}

		for (let i = 0; i < pack.wildcard_slots; i++) {
			const slotSeed = `${openingSeed}:wildcard:${i}`;
			const rarity = determineWildcardRarity(slotSeed, (pack.legendary_chance ?? 0) + (pack.mythic_chance ?? 0));
			const preferredType = WILDCARD_TYPES[i % WILDCARD_TYPES.length];
			const card = await pullCard(rarity, slotSeed, preferredType);
			if (!card) throw new Error(`Insufficient supply for wildcard slot ${i + 1}`);
			pulledCards.push(card);
		}

		const expectedCards = pack.common_slots + pack.rare_slots + pack.epic_slots + pack.wildcard_slots;
		if (pulledCards.length !== expectedCards) {
			throw new Error(`Pack open incomplete: expected ${expectedCards}, got ${pulledCards.length}`);
		}

		for (const card of pulledCards) {
			const mintNumber = getMintNumber(card);

			const existingResult = await client.query(`
				SELECT * FROM user_inventory
				WHERE user_id = $1 AND card_id = $2
				FOR UPDATE
			`, [userId, card.card_id]);

			if (existingResult.rows.length > 0) {
				await client.query(`
					UPDATE user_inventory
					SET quantity = quantity + 1
					WHERE user_id = $1 AND card_id = $2
				`, [userId, card.card_id]);
			} else {
				await client.query(`
					INSERT INTO user_inventory (user_id, card_id, quantity, mint_number)
					VALUES ($1, $2, 1, $3)
				`, [userId, card.card_id, mintNumber]);
			}
		}

		const historyCards = pulledCards.map(buildHistoryRecord);
		await client.query(`
			UPDATE pack_history
			SET cards_received = $2
			WHERE id = $1
		`, [historyId, JSON.stringify(historyCards)]);

		await client.query('COMMIT');

		// Invalidate supply-stats cache after successful open
		cache.delete('supply-stats');

		return res.json({
			success: true,
			packType: pack.name,
			cards: pulledCards.map(c => ({
				cardId: c.card_id,
				cardName: c.card_name,
				nftRarity: c.nft_rarity,
				cardType: c.card_type,
				heroClass: c.hero_class,
				remainingSupply: c.remaining_supply,
				maxSupply: c.max_supply,
				mintNumber: getMintNumber(c),
			})),
			totalPulled: pulledCards.length,
		});

	} catch (error: any) {
		await client.query('ROLLBACK');
		console.error('Error opening pack:', error);
		return res.status(500).json({ success: false, error: 'Failed to open pack' });
	} finally {
		client.release();
	}
});

/**
 * GET /api/packs/history/:userId
 * Returns pack opening history for a user
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const historyResult = await directDb.query(`
      SELECT ph.*, pt.name as pack_name
      FROM pack_history ph
      JOIN pack_types pt ON ph.pack_type_id = pt.id
      WHERE ph.user_id = $1
      ORDER BY ph.opened_at DESC
      LIMIT 50
    `, [userId]);

    res.json({
      success: true,
      history: historyResult.rows.map(row => {
        let cardsReceived: unknown = [];
        try {
          cardsReceived = JSON.parse(row.cards_received);
        } catch {
          console.error('Malformed cards_received JSON for pack history row:', row.id);
        }
        return { ...row, cards_received: cardsReceived };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching pack history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pack history' });
  }
});

export default router;
