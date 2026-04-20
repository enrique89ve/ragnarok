import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount Pack and Inventory routes — DB-backed if DATABASE_URL set, otherwise stubs
  if (process.env.DATABASE_URL) {
    const packRoutes = (await import("./routes/packRoutes")).default;
    const inventoryRoutes = (await import("./routes/inventoryRoutes")).default;
    app.use('/api/packs', packRoutes);
    app.use('/api/inventory', inventoryRoutes);
  } else {
    app.get('/api/packs', (_req: Request, res: Response) => {
      res.json({ packs: [], message: 'Pack data is chain-derived. Connect Hive wallet to view.' });
    });
    app.get('/api/inventory', (_req: Request, res: Response) => {
      res.json({ cards: [], message: 'Inventory is chain-derived. Connect Hive wallet to view.' });
    });
  }

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Matchmaking routes (always available, no DB required)
  const matchmakingRoutes = (await import("./routes/matchmakingRoutes")).default;
  app.use('/api/matchmaking', matchmakingRoutes);

  // Mock blockchain routes — development/test only, disabled in production
  if (!IS_PRODUCTION) {
    const mockBlockchainRoutes = (await import("./routes/mockBlockchainRoutes")).default;
    app.use('/api/mock-blockchain', mockBlockchainRoutes);
  }

  // Social / friends routes (presence, challenges)
  const socialRoutes = (await import("./routes/socialRoutes")).default;
  app.use('/api/friends', socialRoutes);

  // Trading routes (card/Eitr trade offers)
  const tradeRoutes = (await import("./routes/tradeRoutes")).default;
  app.use('/api/trades', tradeRoutes);

  // Tournament routes (brackets, registration, results)
  const tournamentRoutes = (await import("./routes/tournamentRoutes")).default;
  app.use('/api/tournaments', tournamentRoutes);

  // Chain indexer routes — global state derived from Hive L1 ops
  const chainRoutes = (await import("./routes/chainRoutes")).default;
  app.use('/api/chain', chainRoutes);

  // Treasury multisig routes (signer management, WoT vouching, transactions)
  const treasuryRoutes = (await import("./routes/treasuryRoutes")).default;
  app.use('/api/treasury', treasuryRoutes);

  // NFT Explorer public API (NFTLox-compatible structure)
  const explorerRoutes = (await import("./routes/explorerRoutes")).default;
  app.use('/api/explorer', explorerRoutes);

  // Start the server-side chain indexer (polls Hive RPC for ragnarok-cards ops)
  if (process.env.ENABLE_CHAIN_INDEXER !== 'false') {
    const { startIndexer } = await import("./services/chainIndexer");
    startIndexer();
  } else {
    console.log('[Server] Chain indexer disabled (ENABLE_CHAIN_INDEXER=false)');
  }

  const httpServer = createServer(app);

  return httpServer;
}
