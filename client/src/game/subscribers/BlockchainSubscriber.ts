import { GameEventBus } from '@/core/events/GameEventBus';
import type { GameEndedEvent } from '@/core/events/GameEvents';
import { useGameStore } from '../stores/gameStore';
import { useTransactionQueueStore } from '@/data/blockchain/transactionQueueStore';
import { packageMatchResult, packMatchResultForChain } from '@/data/blockchain/matchResultPackager';
import { isBlockchainPackagingEnabled, isHiveMode } from '../config/featureFlags';
import { generateMatchId, useHiveDataStore } from '@/data/HiveDataLayer';
import { debug } from '../config/debugConfig';
import type { CardUidMapping, PackagedMatchResult } from '@/data/blockchain/types';
import { getCard, putCard } from '@/data/blockchain/replayDB';
import { getLevelForXP } from '@/data/blockchain/cardXPSystem';
import { usePeerStore } from '../stores/peerStore';
import { hiveSync } from '@/data/HiveSync';
import { getActiveTranscript, clearTranscript } from '@/data/blockchain/transcriptBuilder';
import { pinTranscript } from '@/data/blockchain/transcriptIPFS';
import { registerAccount, fetchPlayerElo } from '@/data/chainAPI';
import { computePoW, POW_CONFIG } from '@/data/blockchain/proofOfWork';
import { sha256Hash, canonicalStringify } from '@/data/blockchain/hashUtils';
import { useSeasonStore } from '../stores/seasonStore';
import { getCardsByOwner, getTokenBalance, getEloRating } from '@/data/blockchain/replayDB';
import { hiveEvents } from '@/data/HiveEvents';
import { HIVE_USERNAME_RE } from '../../../../shared/protocol-core/types';

type UnsubscribeFn = () => void;

let unsubscribes: UnsubscribeFn[] = [];
let gamePhaseUnsub: (() => void) | null = null;

// Captured when game transitions mulligan → playing
let gameStartTime = 0;

// Dedup guard: "{winner}_{turnNumber}" — unique per game session
// Prevents double-packaging when both the store watcher and event bus fire for the same game end
let lastProcessedMatchKey = '';

// ---------------------------------------------------------------------------
// Post-match Zustand store refresh from IndexedDB
// ---------------------------------------------------------------------------

async function refreshHiveDataStoreFromIDB(): Promise<void> {
	const username = useHiveDataStore.getState().user?.hiveUsername;
	if (!username) return;

	try {
		const [cards, tokenBalance, eloRating] = await Promise.all([
			getCardsByOwner(username),
			getTokenBalance(username),
			getEloRating(username),
		]);

		const store = useHiveDataStore.getState();
		store.loadFromHive({ cardCollection: cards, tokenBalance });
		store.updateStats({
			odinsEloRating: eloRating.elo,
			wins: eloRating.wins,
			losses: eloRating.losses,
			totalGamesPlayed: eloRating.wins + eloRating.losses,
		});

		debug.combat('[BlockchainSubscriber] HiveDataStore refreshed from IndexedDB');
	} catch (err) {
		debug.warn('[BlockchainSubscriber] Failed to refresh HiveDataStore:', err);
	}
}

// ---------------------------------------------------------------------------
// Card UID extraction
// ---------------------------------------------------------------------------

/**
 * Builds a CardUidMapping array from all card instances a player used.
 * Uses nft_id if the card is a real NFT, otherwise synthesizes a
 * deterministic test UID so XP calculations produce real data in test mode.
 */
function extractCardUidsFromGameState(side: 'player' | 'opponent'): CardUidMapping[] {
	const gs = useGameStore.getState().gameState;
	if (!gs) return [];

	const player = gs.players[side];
	if (!player) return [];

	const seenUids = new Set<string>();
	const uids: CardUidMapping[] = [];

	const allInstances = [
		...(player.battlefield ?? []),
		...(player.graveyard ?? []),
		...(player.hand ?? []),
	];

	const hiveMode = isHiveMode();
	for (const instance of allInstances) {
		const cardId = instance.card?.id;
		if (typeof cardId !== 'number') continue;

		const nftUid: string | undefined = instance.nft_id;
		if (hiveMode && !nftUid) continue;

		const uid: string = nftUid ?? `test_${side}_${cardId}_${instance.instanceId ?? '0'}`;

		if (seenUids.has(uid)) continue;
		seenUids.add(uid);
		uids.push({ uid, cardId });
	}

	return uids;
}

/**
 * Builds a cardId → rarity map from card instances already in game state.
 * Avoids a separate allCards import — the data is already in memory.
 */
function buildCardRarities(
	playerUids: CardUidMapping[],
	opponentUids: CardUidMapping[]
): Map<number, string> {
	const gs = useGameStore.getState().gameState;
	const rarities = new Map<number, string>();
	if (!gs) return rarities;

	const relevantIds = new Set([
		...playerUids.map(u => u.cardId),
		...opponentUids.map(u => u.cardId),
	]);

	for (const side of ['player', 'opponent'] as const) {
		const player = gs.players[side];
		if (!player) continue;

		const allInstances = [
			...(player.battlefield ?? []),
			...(player.graveyard ?? []),
			...(player.hand ?? []),
		];

		for (const instance of allInstances) {
			const cardId = instance.card?.id;
			if (typeof cardId !== 'number' || !relevantIds.has(cardId) || rarities.has(cardId)) continue;
			const rarity: string = instance.card?.rarity ?? 'common';
			rarities.set(cardId, rarity.toLowerCase());
		}
	}

	return rarities;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function handleGameEnded(_event: GameEndedEvent): Promise<void> {
	if (!isBlockchainPackagingEnabled()) return;

	const gameState = useGameStore.getState().gameState;
	if (!gameState || gameState.gamePhase !== 'game_over') return;

	// Dedup: both the store watcher and event bus can fire for the same game end
	const matchKey = `${gameState.winner ?? 'unknown'}_${gameState.turnNumber}`;
	if (matchKey === lastProcessedMatchKey) {
		debug.warn('[BlockchainSubscriber] Duplicate game-end suppressed, key:', matchKey);
		return;
	}
	lastProcessedMatchKey = matchKey;

	const hiveData = useHiveDataStore.getState();
	const playerUsername = hiveData.user?.hiveUsername;
	if (!playerUsername) {
		debug.warn('[BlockchainSubscriber] No Hive user logged in, skipping packaging');
		return;
	}

	const playerEloBefore = hiveData.stats?.odinsEloRating ?? 1000;

	// Use real start time captured at game start; fall back to 1 minute ago
	const startTime = gameStartTime > 0 ? gameStartTime : Date.now() - 60_000;

	// Opponent identifier: real Hive username in P2P, heroId for AI games
	const opponentUsername =
		gameState.players.opponent.hiveUsername ??
		gameState.players.opponent.heroId ??
		'ai-opponent';

	// Determine match type from game context — only P2P games against real Hive users are ranked
	const peer = usePeerStore.getState();
	const isP2PMatch = peer.connectionState === 'connected';
	const hasRealOpponent = opponentUsername !== 'ai-opponent' && HIVE_USERNAME_RE.test(opponentUsername);
	const matchType = (isP2PMatch && hasRealOpponent) ? 'ranked' as const : 'casual' as const;

	/*
	  PvP narrative wrapper — record this match in the local rivalry
	  store and (for ranked) the faction win/loss tally. Lets the
	  matchmaking lobby display "Rematch! 3-2" against returning
	  opponents and the faction page show personal contribution.

	  Only fires for matches with a real opponent (not AI). Wrapped in
	  a dynamic import so the BlockchainSubscriber doesn't carry a hard
	  dependency on the pvp module — if it fails to load, packaging
	  continues unaffected.
	*/
	if (hasRealOpponent && gameState.winner) {
		const playerWon = gameState.winner === 'player';
		const opponentDisplayName = gameState.players.opponent.heroId ?? opponentUsername;
		import('../pvp')
			.then(mod => {
				mod.useRivalryStore.getState().recordResult(opponentUsername, opponentDisplayName, playerWon);
				if (matchType === 'ranked') {
					mod.useFactionStore.getState().recordPvpResult(playerWon);
				}
			})
			.catch(err => debug.warn('[BlockchainSubscriber] PvP narrative tracking failed:', err));
	}

	// Extract card UIDs and rarities from live game state
	const playerCardUids = extractCardUidsFromGameState('player');
	const opponentCardUids = extractCardUidsFromGameState('opponent');
	const cardRarities = buildCardRarities(playerCardUids, opponentCardUids);

	// Look up opponent ELO from the chain indexer (non-blocking, falls back to 1000)
	let opponentEloBefore = 1000;
	if (opponentUsername && opponentUsername !== 'ai-opponent') {
		try {
			const { elo } = await fetchPlayerElo(opponentUsername);
			opponentEloBefore = elo;
		} catch {
			// Chain indexer unreachable — use default
		}
	}

	const input = {
		matchId: generateMatchId(),
		matchType,
		playerUsername,
		opponentUsername,
		playerHeroId: gameState.players.player.heroId ?? '',
		opponentHeroId: gameState.players.opponent.heroId ?? '',
		startTime,
		seed: useGameStore.getState().matchSeed ?? `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		playerCardUids,
		opponentCardUids,
		playerEloBefore,
		opponentEloBefore,
	};

	// Pass collection only if non-empty (calculateXPRewards handles null gracefully)
	const collection = hiveData.cardCollection?.length ? hiveData.cardCollection : null;

	packageMatchResult(gameState, input, collection ?? undefined, cardRarities)
		.then(async (result) => {
			// Compute Merkle transcript root, pin to IPFS, and embed in result
			const transcript = getActiveTranscript();
			let enrichedResult = result;
			if (transcript && transcript.getMoveCount() > 0) {
				try {
					const transcriptRoot = await transcript.buildMerkleTree();
					enrichedResult = { ...result, transcriptRoot };
					debug.combat('[BlockchainSubscriber] Transcript root:', transcriptRoot.slice(0, 16) + '...', 'moves:', transcript.getMoveCount());

					// Pin transcript to IPFS (non-blocking — CID attached if available before broadcast)
					const bundle = await transcript.toTranscriptBundle(result.matchId, result.seed);
					const cid = await pinTranscript(bundle);
					if (cid) {
						enrichedResult = { ...enrichedResult, transcriptCID: cid };
						debug.combat('[BlockchainSubscriber] Transcript pinned:', cid);
					}
				} catch (err) {
					debug.warn('[BlockchainSubscriber] Failed to build/pin transcript:', err);
				}
			}
			clearTranscript();

			const finalResult = await attemptDualSig(enrichedResult);

			// Ranked matches require dual signatures — skip broadcast if counterparty didn't sign
			if (finalResult.matchType === 'ranked' &&
				(!finalResult.signatures?.counterparty)) {
				debug.warn('[BlockchainSubscriber] Skipping ranked match broadcast — dual-sig incomplete');
			} else {
				enqueueResult(finalResult, playerCardUids.length, startTime);
			}
		})
		.catch((err) => {
			debug.error('[BlockchainSubscriber] Failed to package match result:', err);
		});
}

// ---------------------------------------------------------------------------
// Dual-signature proposal (P2P ranked matches)
// ---------------------------------------------------------------------------

const DUAL_SIG_TIMEOUT_MS = 30_000;

async function attemptDualSig(result: PackagedMatchResult): Promise<PackagedMatchResult> {
	const peer = usePeerStore.getState();
	if (peer.connectionState !== 'connected' || !peer.isHost) return result;
	if (result.matchType !== 'ranked') return result;

	try {
		const broadcasterSig = await hiveSync.signResultHash(result.hash);
		const proposalId = crypto.randomUUID();
		peer.send({ type: 'result_propose', result, hash: result.hash, broadcasterSig, proposalId });

		const counterpartySig = await waitForCountersign(DUAL_SIG_TIMEOUT_MS);
		if (counterpartySig) {
			return { ...result, signatures: { broadcaster: broadcasterSig, counterparty: counterpartySig } };
		}

		// Ranked matches MUST have dual signatures — do NOT broadcast with empty counterparty
		debug.warn('[BlockchainSubscriber] Dual-sig timeout/rejected — ranked match result blocked (requires both signatures)');
		return result; // No signatures attached = downstream won't broadcast
	} catch (err) {
		debug.warn('[BlockchainSubscriber] Dual-sig signing failed — match result will not be broadcast:', err);
		return result;
	}
}

function waitForCountersign(timeoutMs: number): Promise<string | null> {
	return new Promise((resolve) => {
		const conn = usePeerStore.getState().connection;
		if (!conn) { resolve(null); return; }

		let settled = false;
		const c = conn; // capture non-null ref for closures

		const timer = setTimeout(() => {
			if (!settled) { settled = true; c.off('data', handler); resolve(null); }
		}, timeoutMs);

		function handler(data: unknown) {
			const msg = data as Record<string, unknown>;
			if (msg.type === 'result_countersign' && typeof msg.counterpartySig === 'string') {
				if (!settled) { settled = true; clearTimeout(timer); c.off('data', handler); resolve(msg.counterpartySig); }
			} else if (msg.type === 'result_reject') {
				if (!settled) { settled = true; clearTimeout(timer); c.off('data', handler); resolve(null); }
			}
		}

		c.on('data', handler);
	});
}

async function applyLocalXPAndStampLevelUps(result: PackagedMatchResult): Promise<number> {
	let levelUpCount = 0;
	const queue = useTransactionQueueStore.getState();

	for (const xpReward of result.xpRewards) {
		try {
			const card = await getCard(xpReward.cardUid);
			if (!card) continue;

			const oldLevel = getLevelForXP(card.rarity, card.xp);
			card.xp = xpReward.xpAfter;
			card.level = xpReward.levelAfter;
			await putCard(card);

			if (xpReward.levelAfter > oldLevel) {
				queue.enqueue('level_up', {
					nft_id: xpReward.cardUid,
					card_id: xpReward.cardId,
					new_level: xpReward.levelAfter,
				}, `${result.hash}_levelup_${xpReward.cardUid}`);
				levelUpCount++;
			}
		} catch (err) {
			debug.error(`[BlockchainSubscriber] Failed to apply XP for card ${xpReward.cardUid}:`, err);
		}
	}

	return levelUpCount;
}

async function enqueueResult(result: PackagedMatchResult, playerCardCount: number, startTime: number): Promise<void> {
	const queue = useTransactionQueueStore.getState();

	// Broadcast compact match_result with PoW (64 challenges × 6-bit)
	const compactResult = await packMatchResultForChain(result);
	try {
		const payloadHash = await sha256Hash(canonicalStringify(compactResult));
		const pow = await computePoW(payloadHash, { count: 64, difficulty: 6 });
		(compactResult as unknown as Record<string, unknown>).pow = { nonces: pow.nonces };
	} catch (err) {
		debug.error('[BlockchainSubscriber] PoW computation failed:', err);
	}
	queue.enqueue('match_result', compactResult, result.hash);

	// Write XP locally to IndexedDB; stamp level-ups on chain; refresh Zustand store
	applyLocalXPAndStampLevelUps(result)
		.then(async (levelUpCount) => {
			debug.combat('[BlockchainSubscriber] Local XP applied, level-ups stamped:', levelUpCount);
			await refreshHiveDataStoreFromIDB();
		})
		.catch((err) => {
			debug.error('[BlockchainSubscriber] Failed to apply local XP:', err);
		});

	// Update RUNE token balance in Zustand (10 for win, 3 for loss in ranked)
	if (result.matchType === 'ranked') {
		const playerUsername = useHiveDataStore.getState().user?.hiveUsername;
		if (playerUsername) {
			const isWin = result.winner.username === playerUsername;
			const runeReward = isWin ? 10 : 3;
			const currentBalance = useHiveDataStore.getState().tokenBalance;
			const newRune = (currentBalance?.RUNE ?? 0) + runeReward;
			useHiveDataStore.getState().updateTokenBalance({ RUNE: newRune });
			hiveEvents.emitTokenUpdate('RUNE', newRune, runeReward);
		}
	}

	debug.combat('[BlockchainSubscriber] Packaged and queued:', {
		matchId: result.matchId,
		winner: result.winner.username,
		eloChange: result.eloChanges.winner.delta,
		xpRewards: result.xpRewards.length,
		playerCards: playerCardCount,
		dualSig: !!(result.signatures?.broadcaster && result.signatures?.counterparty),
		duration: Math.round((Date.now() - startTime) / 1000) + 's',
	});

	// Register both players with the chain indexer for global ELO tracking
	registerAccount(result.winner.username).catch(err => debug.warn('Failed to register winner account:', err));
	registerAccount(result.loser.username).catch(err => debug.warn('Failed to register loser account:', err));

	// Record season stats for ranked matches
	if (result.matchType === 'ranked') {
		const playerUsername = useHiveDataStore.getState().user?.hiveUsername;
		if (playerUsername) {
			const isWin = result.winner.username === playerUsername;
			const newElo = isWin
				? result.eloChanges.winner.after
				: result.eloChanges.loser.after;
			useSeasonStore.getState().recordSeasonMatch(isWin, newElo);
		}
	}
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export function initializeBlockchainSubscriber(): UnsubscribeFn {
	dispose();

	gameStartTime = 0;
	lastProcessedMatchKey = '';

	// Listen for GAME_ENDED on the event bus
	unsubscribes.push(
		GameEventBus.subscribe<GameEndedEvent>('GAME_ENDED', handleGameEnded, -10)
	);

	// Watch game phase transitions:
	//   mulligan → playing  : capture real game start time
	//   any      → game_over: fire GAME_ENDED event (single emitter)
	let prevPhase: string | undefined = useGameStore.getState().gameState?.gamePhase;
	gamePhaseUnsub = useGameStore.subscribe((state) => {
		const currentPhase = state.gameState?.gamePhase;

		if (prevPhase === 'mulligan' && currentPhase === 'playing' && gameStartTime === 0) {
			gameStartTime = Date.now();
			debug.combat('[BlockchainSubscriber] Game start time captured');
		}

		if (prevPhase !== 'game_over' && currentPhase === 'game_over') {
			const gs = state.gameState;
			if (gs) {
				GameEventBus.emitGameEnded({
					winner: gs.winner === 'player' || gs.winner === 'opponent' ? gs.winner : null,
					reason: gs.winner === 'draw' ? 'draw' : 'hero_death',
					finalTurn: gs.turnNumber,
				});
			}
		}

		prevPhase = currentPhase;
	});
	unsubscribes.push(gamePhaseUnsub);

	return dispose;
}

function dispose(): void {
	unsubscribes.forEach(fn => fn());
	unsubscribes = [];
	gamePhaseUnsub = null;
	gameStartTime = 0;
	lastProcessedMatchKey = '';
}

export default initializeBlockchainSubscriber;
