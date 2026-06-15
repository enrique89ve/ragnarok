import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { getRagnarokServerRuntimeConfig } from "./services/runtimeConfig";
import { getStats } from "./services/chainState";
import {
  buildClosedBetaCutoverGate,
  buildRagnarokRuntimeEvidence,
} from "../shared/runtimeConfig";
import { buildServerStateEvidence } from "./services/runtimeStateEvidence";

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export async function registerRoutes(app: Express): Promise<Server> {
  const runtime = getRagnarokServerRuntimeConfig();

  // Packs and inventory are chain-derived projections. The old SQL opener stays
  // unmounted so DATABASE_URL cannot accidentally become an authority path.
  const packRoutes = (await import("./routes/packRoutes")).default;
  app.use('/api/packs', packRoutes);
  app.get('/api/inventory/:userId/stats', (_req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error: 'Legacy SQL inventory stats are disabled. Use /api/chain/player/:username/cards.',
    });
  });
  app.get('/api/inventory/:userId?', (_req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error: 'Legacy SQL inventory is disabled. Use /api/chain/player/:username/cards.',
    });
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    const stats = getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      indexer: {
        inSync: stats.inSync,
        lastIrreversibleBlockProcessed: stats.lastIrreversibleBlockProcessed,
        indexStartBlock: stats.indexStartBlock,
        headBlock: stats.headBlock,
        irreversibleBlock: stats.irreversibleBlock,
        syncTargetBlock: stats.syncTargetBlock,
        blocksBehind: stats.blocksBehind,
        progressPercent: stats.progressPercent,
        stateFile: stats.stateFile,
        stateFileConfigured: stats.stateFileConfigured,
      },
      runtime: {
        ...buildRagnarokRuntimeEvidence(runtime),
        state: buildServerStateEvidence(runtime),
        closedBetaCutover: buildClosedBetaCutoverGate(runtime),
      },
    });
  });

  // Matchmaking routes (always available, no DB required)
  const starterClaimRoutes = (await import("./routes/starterClaimRoutes")).default;
  app.use('/api/starter', starterClaimRoutes);

  const matchmakingRoutes = (await import("./routes/matchmakingRoutes")).default;
  app.use('/api/matchmaking', matchmakingRoutes);

  // Mock blockchain routes — local sandbox or explicit mock harness only.
  // dev:testnet must not expose a parallel authority surface.
  if (!IS_PRODUCTION && (runtime.stage === 'local' || process.env.VITE_DATA_LAYER_MODE === 'test')) {
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

  // Admin operator broadcasts: frontend Active transaction signature + server operator Active key.
  const adminRoutes = (await import("./routes/adminRoutes")).default;
  app.use('/api/admin', adminRoutes);

  // NFT Explorer public API (NFTLox-compatible structure)
  const explorerRoutes = (await import("./routes/explorerRoutes")).default;
  app.use('/api/explorer', explorerRoutes);

  // Start the server-side chain indexer (Worker Thread version)
  if (process.env.ENABLE_CHAIN_INDEXER !== 'false') {
    const { startIndexerWorker } = await import("./services/indexerManager");
    startIndexerWorker();
  } else {
    const { loadState, startPersistence } = await import("./services/chainState");
    loadState();
    startPersistence();
    console.log('[Server] Chain indexer disabled (ENABLE_CHAIN_INDEXER=false)');
  }

  const httpServer = createServer(app);

  // P2P relay WebSocket — replaces the old PeerJS broker + WebRTC DataChannel.
  // Mounts at /ws/p2p on the same HTTP server (single port deployment).
  const { attachP2PRelay } = await import("./routes/p2pRelay");
  attachP2PRelay(httpServer);

  return httpServer;
}
