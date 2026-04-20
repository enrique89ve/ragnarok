/**
 * Inventory Routes
 * 
 * Endpoints for user inventory and collection stats.
 */

import express, { Request, Response } from 'express';
import { directDb as _directDb } from '../db';

// This file is only imported when DATABASE_URL is set (see server/routes.ts)
const directDb = _directDb!;

const router = express.Router();

/**
 * GET /api/inventory/:userId
 * Returns user's card collection with quantities
 */
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { page = 1, limit = 50, rarity, type, heroClass } = req.query;
  
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
  const offset = (pageNum - 1) * limitNum;
  
  try {
    // Build the query with optional filters
    let whereClause = 'WHERE ui.user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;
    
    if (rarity) {
      whereClause += ` AND cs.nft_rarity = $${paramIndex}`;
      params.push(rarity);
      paramIndex++;
    }
    
    if (type) {
      whereClause += ` AND cs.card_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (heroClass) {
      whereClause += ` AND cs.hero_class = $${paramIndex}`;
      params.push((heroClass as string).toLowerCase());
      paramIndex++;
    }
    
    // Get total count
    const countResult = await directDb.query(`
      SELECT COUNT(*) as total
      FROM user_inventory ui
      JOIN card_supply cs ON ui.card_id = cs.card_id
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Get paginated results
    const inventoryResult = await directDb.query(`
      SELECT
        ui.id,
        ui.card_id,
        ui.quantity,
        ui.mint_number,
        ui.acquired_at,
        cs.card_name,
        cs.nft_rarity,
        cs.card_type,
        cs.hero_class,
        cs.max_supply,
        cs.remaining_supply
      FROM user_inventory ui
      JOIN card_supply cs ON ui.card_id = cs.card_id
      ${whereClause}
      ORDER BY cs.nft_rarity DESC, cs.card_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limitNum, offset]);
    
    res.json({
      success: true,
      inventory: inventoryResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inventory/:userId/stats
 * Returns collection stats (total owned, by rarity)
 */
router.get('/:userId/stats', async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    // Overall stats
    const overallResult = await directDb.query(`
      SELECT 
        COUNT(DISTINCT ui.card_id) as unique_cards,
        SUM(ui.quantity) as total_cards
      FROM user_inventory ui
      WHERE ui.user_id = $1
    `, [userId]);
    
    // Stats by NFT rarity
    const rarityResult = await directDb.query(`
      SELECT 
        cs.nft_rarity,
        COUNT(DISTINCT ui.card_id) as unique_cards,
        SUM(ui.quantity) as total_cards
      FROM user_inventory ui
      JOIN card_supply cs ON ui.card_id = cs.card_id
      WHERE ui.user_id = $1
      GROUP BY cs.nft_rarity
      ORDER BY 
        CASE cs.nft_rarity 
          WHEN 'mythic' THEN 1 
          WHEN 'legendary' THEN 2 -- legacy DB rows
          WHEN 'mythic' THEN 1
          WHEN 'epic' THEN 3 
          WHEN 'rare' THEN 4 
          WHEN 'common' THEN 5 
        END
    `, [userId]);
    
    // Stats by card type
    const typeResult = await directDb.query(`
      SELECT 
        cs.card_type,
        COUNT(DISTINCT ui.card_id) as unique_cards,
        SUM(ui.quantity) as total_cards
      FROM user_inventory ui
      JOIN card_supply cs ON ui.card_id = cs.card_id
      WHERE ui.user_id = $1
      GROUP BY cs.card_type
    `, [userId]);
    
    // Stats by hero class
    const classResult = await directDb.query(`
      SELECT 
        cs.hero_class,
        COUNT(DISTINCT ui.card_id) as unique_cards,
        SUM(ui.quantity) as total_cards
      FROM user_inventory ui
      JOIN card_supply cs ON ui.card_id = cs.card_id
      WHERE ui.user_id = $1
      GROUP BY cs.hero_class
      ORDER BY cs.hero_class
    `, [userId]);
    
    // Collection completion percentage
    const completionResult = await directDb.query(`
      SELECT 
        (SELECT COUNT(DISTINCT card_id) FROM user_inventory WHERE user_id = $1) as owned,
        (SELECT COUNT(*) FROM card_supply) as total
    `, [userId]);
    
    const owned = parseInt(completionResult.rows[0].owned, 10);
    const totalCards = parseInt(completionResult.rows[0].total, 10);
    const completionPercentage = totalCards > 0 ? (owned / totalCards * 100).toFixed(2) : 0;
    
    // Recent acquisitions
    const recentResult = await directDb.query(`
      SELECT 
        ui.card_id,
        cs.card_name,
        cs.nft_rarity,
        ui.acquired_at
      FROM user_inventory ui
      JOIN card_supply cs ON ui.card_id = cs.card_id
      WHERE ui.user_id = $1
      ORDER BY ui.acquired_at DESC
      LIMIT 10
    `, [userId]);
    
    res.json({
      success: true,
      stats: {
        overall: {
          uniqueCards: parseInt(overallResult.rows[0].unique_cards, 10) || 0,
          totalCards: parseInt(overallResult.rows[0].total_cards, 10) || 0,
          completionPercentage: parseFloat(completionPercentage as string),
        },
        byRarity: rarityResult.rows.map(row => ({
          rarity: row.nft_rarity,
          uniqueCards: parseInt(row.unique_cards, 10),
          totalCards: parseInt(row.total_cards, 10),
        })),
        byType: typeResult.rows.map(row => ({
          type: row.card_type,
          uniqueCards: parseInt(row.unique_cards, 10),
          totalCards: parseInt(row.total_cards, 10),
        })),
        byClass: classResult.rows.map(row => ({
          class: row.hero_class,
          uniqueCards: parseInt(row.unique_cards, 10),
          totalCards: parseInt(row.total_cards, 10),
        })),
        recentAcquisitions: recentResult.rows,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inventory/:userId/card/:cardId
 * Returns details about a specific card in user's inventory
 */
router.get('/:userId/card/:cardId', async (req: Request, res: Response) => {
  const { userId, cardId } = req.params;
  
  try {
    const result = await directDb.query(`
      SELECT
        ui.id,
        ui.card_id,
        ui.quantity,
        ui.mint_number,
        ui.acquired_at,
        cs.card_name,
        cs.nft_rarity,
        cs.card_type,
        cs.hero_class,
        cs.max_supply,
        cs.remaining_supply
      FROM user_inventory ui
      JOIN card_supply cs ON ui.card_id = cs.card_id
      WHERE ui.user_id = $1 AND ui.card_id = $2
    `, [userId, cardId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Card not found in inventory' 
      });
    }
    
    return res.json({
      success: true,
      card: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching card details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
