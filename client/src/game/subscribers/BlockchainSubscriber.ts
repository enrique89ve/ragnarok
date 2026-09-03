import { GameEventBus } from '@/core/events/GameEventBus';
import type { GameEndedEvent } from '@/core/events/GameEvents';
import { useGameStore } from '../stores/gameStore';
import { useTransactionQueueStore } from '@/data/blockchain/transactionQueueStore';
import { packageMatchResult, packMatchResultForChain, computeMatchResultCommitmentHash } from '@/data/blockchain/matchResultPackager';
import { isBlockchainPackagingEnabled } from '../config/featureFlags';
import { generateMatchId, useHiveDataStore } from '@/data/HiveDataLayer';
import { getStarterUid, isStarterEntitlementAsset, type HiveCardAsset } from '@/data/schemas/HiveTypes';
import { debug } from '../config/debugConfig';
import type { CardOwnershipSource, CardUidMapping, PackagedMatchResult } from '@/data/blockchain/types';
import { getCard, putCard } from '@/data/blockchain/replayDB';
import { deriveRuneSeasonId } from '@shared/protocol-core/runeSeasonHash';
import { getRagnarokNetworkConfig } from '../config/networkConfig';
import { xpKeyFor } from '@/data/blockchain/cardXPRewards';
import { getEconomicLevelForXP } from '@shared/protocol-core/cardProgression';
import { usePeerStore } from '../stores/peerStore';
import { useMatchStore } from '../match/store';
import { derivePackagedMatchType } from '../match/packagedMatchType';
import { getActiveTranscript, clearTranscript, recordSessionEvent } from '@/data/blockchain/transcriptBuilder';
import { pinTranscript } from '@/data/blockchain/transcriptIPFS';
import { registerAccount, fetchPlayerElo } from '@/data/chainAPI';
import { computePoW } from '@/data/blockchain/proofOfWork';
import { sha256Hash, canonicalStringify } from '@/data/blockchain/hashUtils';
import { useSeasonStore } from '../stores/seasonStore';
import { getCardsByOwner, getTokenBalance, getEloRating } from '@/data/blockchain/replayDB';
import { getLatestLocalCardProgressionByOwner } from '@/data/blockchain/replayDB';
import { indexedDbLocalSettlementStore } from '@/data/blockchain/localSettlementStore';
import { settleLocalP2PGameOver } from './localP2PSettlement';
import { buildRagnarokRuntimeEvidence } from '@shared/runtimeConfig';
import { getCurrentHiveUsername } from '@/data/HiveSessionIdentity';
import { HIVE_USERNAME_RE } from '../../../../shared/protocol-core/types';
import { isStarterEntitlementCardId } from '@shared/schemas/starterEntitlement';
import { handleLocalP2PGameEnded, routeP2PGameEnded } from './localP2PGameEndedBoundary';
import { resolveLocalP2PSettlementCause } from './localP2PSettlement';

type UnsubscribeFn = () => void;
type RuntimeCardSource =
	| { kind: 'owned'; source: CardOwnershipSource; uid: string }
	| { kind: 'localDevCatalog' };

let unsubscribes: UnsubscribeFn[] = [];
let gamePhaseUnsub: (() => void) | null = null;

// Captured when game transitions mulligan → playing
let gameStartTime = 0;

// Dedup guard: "{winner}_{turnNumber}" — unique per game session
// Prevents double-packaging when both the store watcher and event bus fire for the same game end
let lastProcessedMatchKey = '';

function preserveStarterEntitlements(chainCards: HiveCardAsset[], currentCards: HiveCardAsset[]): HiveCardAsset[] {
	const chainUids = new Set(chainCards.map(card => card.uid));
	const starters = currentCards.filter(card => isStarterEntitlementAsset(card) && !chainUids.has(card.uid));
	return [...chainCards, ...starters];
}

// ---------------------------------------------------------------------------
// Post-match Zustand store refresh from IndexedDB
// ---------------------------------------------------------------------------

async function refreshHiveDataStoreFromIDB(): Promise<void> {
	const username = useHiveDataStore.getState().user?.hiveUsername;
	if (!username) return;

	try {
		const seasonId = deriveRuneSeasonId(getRagnarokNetworkConfig());
		const [cards, tokenBalance, eloRating] = await Promise.all([
			getCardsByOwner(username),
			getTokenBalance(username, seasonId),
			getEloRating(username),
		]);

		const store = useHiveDataStore.getState();
		store.loadFromHive({
			cardCollection: preserveStarterEntitlements(cards, store.cardCollection),
			tokenBalance,
		});
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

function resolveRuntimeCardSource(
	nftUid: string | undefined,
	cardId: number,
	category: string | undefined,
): RuntimeCardSource {
	if (nftUid) return { kind: 'owned', source: 'nft', uid: nftUid };
	if (category === 'starter' && isStarterEntitlementCardId(cardId)) {
		return { kind: 'owned', source: 'starter', uid: getStarterUid(cardId) };
	}
	return { kind: 'localDevCatalog' };
}

/**
 * Builds a CardUidMapping array from all card instances a player used.
 * NFTs use their chain UID. Starter cards use their fixed off-chain
 * entitlement UID. Local/dev catalog cards are gameplay-only and are not
 * packaged as owned economic assets.
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

	for (const instance of allInstances) {
		const cardId = instance.card?.id;
		if (typeof cardId !== 'number') continue;

		const nftUid: string | undefined = instance.nft_id;
		const runtimeSource = resolveRuntimeCardSource(nftUid, cardId, instance.card?.category);
		if (runtimeSource.kind === 'localDevCatalog') continue;

		if (seenUids.has(runtimeSource.uid)) continue;
		seenUids.add(runtimeSource.uid);
		uids.push({ uid: runtimeSource.uid, cardId, source: runtimeSource.source });
	}

	return uids;
}

/**
 * Builds a cardId → XP-progression key map for economic NFT cards only.
 * Starter cards use account-bound reputation, not CardXP.
 */
function buildCardRarities(
	playerUids: CardUidMapping[],
	opponentUids: CardUidMapping[]
): Map<number, string> {
	const gs = useGameStore.getState().gameState;
	const xpKeys = new Map<number, string>();
	if (!gs) return xpKeys;

	const relevantIds = new Set([
		...playerUids.filter(u => u.source === 'nft').map(u => u.cardId),
		...opponentUids.filter(u => u.source === 'nft').map(u => u.cardId),
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
			if (typeof cardId !== 'number' || !relevantIds.has(cardId) || xpKeys.has(cardId)) continue;
			xpKeys.set(cardId, xpKeyFor(instance.card ?? {}));
		}
	}

	return xpKeys;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

/**
 * Terminal local-peer boundary. Keeping this adapter separate makes the
 * no-external-output contract executable without importing Hive packaging in a
 * local settlement test.
 */
export async function handleGameEnded(event: GameEndedEvent): Promise<void> {
	const gameState = useGameStore.getState().gameState;
	if (!gameState || gameState.gamePhase !== 'game_over') return;
	const runtimeConfig = getRagnarokNetworkConfig();
	const runtimeEvidence = buildRagnarokRuntimeEvidence(runtimeConfig);
	const activeMatch = useMatchStore.getState().activeMatch;
	const settlementCause = resolveLocalP2PSettlementCause({
		eventReason: event.reason,
		lifecycleKind: usePeerStore.getState().battleLifecycle?.result?.kind,
	});
	if (settlementCause === 'technical_abandonment') {
		debug.combat('[BlockchainSubscriber] Technical P2P close — no local or external settlement');
		return;
	}
	const route = await routeP2PGameEnded({
		gameState,
		activeMatch,
		runtimeEvidence,
		runLocalSettlement: async () => {
			if (!activeMatch) return { status: 'skipped', reason: 'not_peer' };
			return handleLocalP2PGameEnded(gameState, activeMatch, {
				runtimeConfig,
				runtimeEvidence,
				getLocalAccount: getCurrentHiveUsername,
				getEloRating,
				getTokenBalance,
				getLatestCardProgressionByOwner: getLatestLocalCardProgressionByOwner,
				getTranscriptRoot: async () => {
					const transcript = getActiveTranscript();
					return transcript && transcript.getMoveCount() > 0 ? transcript.buildMerkleTree() : undefined;
				},
				clearTranscript,
				settlementStore: indexedDbLocalSettlementStore,
				now: Date.now,
			});
		},
		runExternalSettlement: () => runExternalGameEnded(event),
	});
	if (route.route !== 'external') {
		if (route.route === 'local') debug.combat('[BlockchainSubscriber] Local P2P settlement:', route.result.status);
		return;
	}
}

async function runExternalGameEnded(_event: GameEndedEvent): Promise<void> {
	const gameState = useGameStore.getState().gameState;
	if (!gameState || gameState.gamePhase !== 'game_over') return;

	// This function is the external settlement callback only. The router invokes
	// it for F2/F3; F1 peer matches return through local IndexedDB before this
	// function can reach any Hive packaging dependency.
	const runtimeConfig = getRagnarokNetworkConfig();

	if (!isBlockchainPackagingEnabled()) return;

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

	const hasRealOpponent = opponentUsername !== 'ai-opponent' && HIVE_USERNAME_RE.test(opponentUsername);
	const matchType = derivePackagedMatchType({
		ctx: useMatchStore.getState().activeMatch,
		hasDualSignedAnchor: false,
	});

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

async function attemptDualSig(result: PackagedMatchResult): Promise<PackagedMatchResult> {
	const peer = usePeerStore.getState();
	if (peer.connectionState !== 'connected') return result;
	if (result.matchType !== 'ranked') return result;

	try {
		const commitmentHash = await computeMatchResultCommitmentHash(result);
		const proposalId = crypto.randomUUID();
		recordSessionEvent('result_signature_deferred', {
			matchId: result.matchId,
			proposerWinner: result.winner.username,
			proposerLoser: result.loser.username,
			proposalId,
			commitmentHash,
		});
		debug.warn('[BlockchainSubscriber] Ranked result signature deferred — hidden Keychain prompts are disabled');
		GameEventBus.emitNotification({
			level: 'warning',
			message: 'Ranked result needs wallet review before on-chain submit. Hidden Keychain prompts are disabled.',
			duration: 8000,
		});
	} catch (err) {
		debug.warn('[BlockchainSubscriber] Failed to prepare ranked result signature prompt:', err);
	}
	return result;
}

async function applyLocalXPAndStampLevelUps(result: PackagedMatchResult): Promise<number> {
	let levelUpCount = 0;
	const queue = useTransactionQueueStore.getState();

	for (const xpReward of result.xpRewards) {
		try {
			const card = await getCard(xpReward.cardUid);
			if (!card) continue;

			const oldLevel = getEconomicLevelForXP(card.rarity, card.xp);
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
				const technical = usePeerStore.getState().battleLifecycle?.result?.kind === 'technical_abandonment';
				GameEventBus.emitGameEnded({
					winner: gs.winner === 'player' || gs.winner === 'opponent' ? gs.winner : null,
					reason: technical ? 'technical' : gs.winner === 'draw' ? 'draw' : 'hero_death',
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
