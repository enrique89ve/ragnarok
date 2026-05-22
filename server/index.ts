import { config as loadDotenv } from 'dotenv';
import express, { type Request, Response, NextFunction } from "express";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";

function resolveCliMode(): string {
  const modeIndex = process.argv.indexOf('--mode');
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : undefined;
  return mode && !mode.startsWith('-') ? mode : (process.env.NODE_ENV ?? 'development');
}

loadDotenv();
const envMode = resolveCliMode();
if (envMode !== 'development' && envMode !== 'production') {
  loadDotenv({ path: `.env.${envMode}`, override: true });
}

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getHttpErrorStatus(error: unknown): number {
  if (!isRecord(error)) return 500;
  const status = error.status ?? error.statusCode;
  return typeof status === 'number' && Number.isInteger(status) ? status : 500;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === 'string') return error.message;
  return 'Internal Server Error';
}

type ListenError = Error & {
  readonly code?: string;
};

app.use(helmet({
  contentSecurityPolicy: isDev ? false : undefined,
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, try again later' },
});
app.use('/api', apiLimiter);

const adminBroadcastLimiter = rateLimit({
  windowMs: 60_000,
  limit: isDev ? 20 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Admin broadcast rate limit exceeded' },
});
app.use('/api/admin/broadcast', adminBroadcastLimiter);
app.use('/api/admin/multisig', adminBroadcastLimiter);

const adminSessionLimiter = rateLimit({
  windowMs: 60_000,
  limit: isDev ? 30 : 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Admin session rate limit exceeded' },
});
app.use('/api/admin/session', adminSessionLimiter);

// Status and health checks should be frequent but not abused.
const statusLimiter = rateLimit({
  windowMs: 60_000,
  limit: isDev ? 120 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Status check rate limit exceeded' },
});
app.use('/api/health', statusLimiter);
app.use('/api/chain/status', statusLimiter);

// Chain reads are public, but some routes can trigger a bounded Hive scan when
// the account is unknown. Keep those below normal UI retry/refresh rates.
const chainOnDemandSyncLimiter = rateLimit({
  windowMs: 60_000,
  limit: isDev ? 90 : 24,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Chain sync lookup rate limit exceeded' },
});
app.get('/api/chain/player/:username', chainOnDemandSyncLimiter);
app.get('/api/chain/player/:username/rune', chainOnDemandSyncLimiter);
app.get('/api/chain/player/:username/cards', chainOnDemandSyncLimiter);
app.post('/api/chain/verify-deck', chainOnDemandSyncLimiter);
app.post('/api/chain/register', chainOnDemandSyncLimiter);

// ELO lookup is used during P2P flow and only registers unknown accounts.
const chainLookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: isDev ? 180 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Chain lookup rate limit exceeded' },
});
app.get('/api/chain/player/:username/elo', chainLookupLimiter);
app.get('/api/explorer/users/:username', chainLookupLimiter);

// RUNE reads are in-memory, but state/ledger views scan or sort replay-derived
// data. Wallet/dashboard refresh should stay comfortably below this.
const runeReadLimiter = rateLimit({
  windowMs: 60_000,
  limit: isDev ? 180 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'RUNE read rate limit exceeded' },
});
app.get('/api/chain/rune/state', runeReadLimiter);
app.get('/api/chain/rune/ledger', runeReadLimiter);
app.get('/api/chain/rune/balances', runeReadLimiter);

// Sensitive endpoint limiter: queue/leave matchmaking + tournament register/result.
//
// Calibration rationale:
// - Normal user with 2-3 retries hits ~6 req/min easily. Old 6/min cap caused
//   false-positive 429s that surface as "Matchmaking service unavailable".
// - Per-IP rate limiting CANNOT stop a distributed bot (multi-IP) anyway —
//   that requires proof-of-work / captcha / Hive-auth tokens (see
//   requireHiveBodyAuthIfUsernamePresent middleware on /queue).
// - The endpoints are in-memory operations (no DB, no remote calls), cost
//   per request is nanoseconds. Stale entries auto-purge every 60s.
// - Prod 30/min: 5× normal usage headroom, still catches single-IP floods
//   (>500 req/min would trip easily).
// - Dev 120/min: smoke testing involves browser refresh + reconnect loops
//   that legitimately exceed 30/min. `isDev` already declared at module scope.
const sensitiveLimiter = rateLimit({
  windowMs: 60_000,
  limit: isDev ? 120 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded for this endpoint' },
});
app.use('/api/matchmaking/queue', sensitiveLimiter);
app.use('/api/matchmaking/leave', sensitiveLimiter);
app.use('/api/tournaments/:id/register', sensitiveLimiter);
app.use('/api/tournaments/:id/result', sensitiveLimiter);

const packOpenLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Pack opening rate limit exceeded, try again later' },
});
app.use('/api/packs/open', packOpenLimiter);

const challengeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Challenge rate limit exceeded' },
});
app.use('/api/friends/challenge', challengeLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

app.use('/api/testnet/rune', (_req, res) => {
  res.status(410).json({
    success: false,
    error: 'Legacy RUNE testnet API has been removed. Use /api/chain/rune/* or /api/chain/player/:username/rune.',
  });
});

(async () => {
  // ADR 0004 §Decision.3 (issue 05) — validate witness signing config at
  // boot when env vars are set. Non-fatal if absent (match/pending routes
  // will return 503 until configured); fatal if WIF parses but the derived
  // pubkey is not a Posting authority for the named account (silent
  // misconfiguration is worse than a hard fail).
  if (process.env.WITNESS_HIVE_ACCOUNT && process.env.WITNESS_HIVE_POSTING_KEY) {
    const { validateWitnessConfig } = await import('./services/matchPendingQueue');
    try {
      const witness = await validateWitnessConfig();
      log(`witness signer ready: ${witness.account} (${witness.pubkey.slice(0, 12)}…)`);
    } catch (err) {
      console.error('[boot] witness config invalid:', err instanceof Error ? err.message : err);
      throw err;
    }
  } else {
    log('witness signer not configured — /api/chain/match/pending routes will return 503');
  }

  {
    const {
      shouldValidateAdminOperatorConfig,
      validateAdminOperatorConfig,
    } = await import('./services/adminOperatorBroadcaster');
    if (shouldValidateAdminOperatorConfig()) {
      const { getRagnarokServerRuntimeConfig } = await import('./services/runtimeConfig');
      try {
        const signer = await validateAdminOperatorConfig(getRagnarokServerRuntimeConfig());
        log(`admin operator signer ready: ${signer.account} (${signer.publicKey.slice(0, 12)}…)`);
      } catch (err) {
        console.error('[boot] admin operator config invalid:', err instanceof Error ? err.message : err);
        throw err;
      }
    } else {
      log('admin operator signer not configured — admin broadcast/multisig routes will return 503');
    }
  }

  {
    const {
      shouldValidateIndexCheckpointPublisherConfig,
      validateIndexCheckpointPublisherConfig,
    } = await import('./services/indexCheckpointPublisher');
    if (shouldValidateIndexCheckpointPublisherConfig()) {
      const { getRagnarokServerRuntimeConfig } = await import('./services/runtimeConfig');
      try {
        const signer = await validateIndexCheckpointPublisherConfig(getRagnarokServerRuntimeConfig());
        const { isIndexCheckpointDryRun } = await import('./services/indexCheckpointPublisher');
        const mode = signer.enabled
          ? (isIndexCheckpointDryRun() ? 'enabled dry-run' : 'enabled')
          : 'configured but disabled';
        log(`index checkpoint publisher ${mode}: ${signer.account} (${signer.publicKey.slice(0, 12)}…)`);
      } catch (err) {
        console.error('[boot] index checkpoint publisher config invalid:', err instanceof Error ? err.message : err);
        throw err;
      }
    } else {
      log('index checkpoint publisher disabled — no checkpoint signer configured');
    }
  }

  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = getHttpErrorStatus(err);
    console.error(`[error] ${status}:`, err);
    const message = app.get("env") === "production"
      ? "Internal Server Error"
      : getErrorMessage(err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const viteDevServerModule = "./vite";
    const { setupVite } = await import(viteDevServerModule);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve both the API and client from one HTTP server.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.on('error', (error: ListenError) => {
    if (error.code === 'EADDRINUSE') {
      log(`port ${port} is already in use; stop the existing server or run with PORT=<free-port> npm run dev:testnet`);
      process.exit(1);
    }
    throw error;
  });
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });

  let isShuttingDown = false;
  function formatShutdownError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log(`received ${signal}, flushing chain state`);

    try {
      const { stopIndexerWorker } = await import("./services/indexerManager");
      stopIndexerWorker();
    } catch (err) {
      log(`[shutdown] failed to stop chain indexer worker: ${formatShutdownError(err)}`);
    }

    const forcedExit = setTimeout(() => {
      log('[shutdown] timed out waiting for HTTP server close');
      process.exit(1);
    }, 10_000);
    forcedExit.unref();

    server.close(error => {
      if (error) {
        log(`[shutdown] HTTP server close failed: ${formatShutdownError(error)}`);
        process.exit(1);
      }
      process.exit(0);
    });
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
})();
