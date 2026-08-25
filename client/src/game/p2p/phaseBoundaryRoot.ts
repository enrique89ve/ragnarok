/** Deterministic client projection used only at notarized phase boundaries. */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { Hash256Schema, parseHash256, type Hash256 } from '@shared/p2p-wire/integrity';
import { canonicalStringify } from '@shared/protocol-core/hash';

import { computeCardsPrevStateHash } from '../engine/wireHash';
import { useGameStore } from '../stores/gameStore';
import { useUnifiedCombatStore, type UnifiedCombatStore } from '../stores/unifiedCombatStore';
import type { PhaseCheckpointPhase } from '@shared/p2p-wire/phaseCheckpoint';
import {
	canonicalPokerCard,
	canonicalizePokerCombatState,
} from './phaseBoundaryProjection';
export { computePokerCombatStateHash } from './pokerStateHash';

const ENCODER = new TextEncoder();
const PHASE_BOUNDARY_ROOT_VERSION = 1 as const;
type CanonicalRole = 'attacker' | 'defender';

function canonicalChess(store: UnifiedCombatStore) {
	return {
		pieces: store.boardState.pieces.map((piece) => ({
			id: piece.id,
			type: piece.type,
			owner: piece.owner,
			position: piece.position,
			hasMoved: piece.hasMoved,
			health: piece.health,
			maxHealth: piece.maxHealth,
			stamina: piece.stamina,
			heroClass: piece.heroClass,
			heroId: piece.heroId ?? null,
			deckCardIds: piece.deckCardIds,
			fixedCards: piece.fixedCards ?? [],
			hasSpells: piece.hasSpells,
			element: piece.element,
		})).sort((left, right) => left.id.localeCompare(right.id)),
		currentTurn: store.boardState.currentTurn,
		gameStatus: store.boardState.gameStatus,
		moveCount: store.boardState.moveCount,
		inCheck: store.boardState.inCheck,
		sharedDeckCardIds: store.sharedDeckCardIds,
		pendingCombat: store.pendingCombat
			? {
				attackerId: store.pendingCombat.attacker.id,
				defenderId: store.pendingCombat.defender.id,
				attackerPosition: store.pendingCombat.attackerPosition,
				defenderPosition: store.pendingCombat.defenderPosition,
				instantKill: store.pendingCombat.instantKill ?? false,
			}
			: null,
		activeMines: store.allActiveMines.map((mine) => ({
			id: mine.id,
			owner: mine.owner,
			kingId: mine.kingId,
			centerPosition: mine.centerPosition,
			affectedTiles: mine.affectedTiles,
			staPenalty: mine.staPenalty,
			manaBoost: mine.manaBoost,
			placedOnTurn: mine.placedOnTurn,
			expiresOnTurn: mine.expiresOnTurn,
			triggered: mine.triggered,
		})).sort((left, right) => left.id.localeCompare(right.id)),
		pendingManaBoost: store.pendingManaBoost,
	};
}

function canonicalPokerSpells(store: UnifiedCombatStore, playerRole: CanonicalRole | null) {
	const spellState = store.pokerSpellState;
	if (!spellState || !playerRole) return null;
	const opponentRole: CanonicalRole = playerRole === 'attacker' ? 'defender' : 'attacker';
	const owner = (slot: 'player' | 'opponent') => slot === 'player' ? playerRole : opponentRole;
	return {
		activeSpells: spellState.activeSpells.map((spell) => ({
			...spell,
			owner: owner(spell.owner),
		})).sort((left, right) => left.id.localeCompare(right.id)),
		byRole: {
			[playerRole]: {
				bluffTokens: spellState.playerBluffTokens,
				staminaShield: spellState.playerStaminaShield,
				echoBetReady: spellState.playerEchoBetReady,
				shadowFoldActive: spellState.playerShadowFoldActive,
				foldCurseActive: spellState.playerFoldCurseActive,
				voidStareActive: spellState.playerVoidStareActive,
				nornsGlimpseActive: spellState.playerNornsGlimpseActive,
				allInAura: spellState.playerAllInAura,
				destinyOverrideReady: spellState.playerDestinyOverrideReady,
				revealedCards: spellState.revealedPlayerCards,
			},
			[opponentRole]: {
				bluffTokens: spellState.opponentBluffTokens,
				staminaShield: spellState.opponentStaminaShield,
				echoBetReady: spellState.opponentEchoBetReady,
				shadowFoldActive: spellState.opponentShadowFoldActive,
				foldCurseActive: spellState.opponentFoldCurseActive,
				voidStareActive: spellState.opponentVoidStareActive,
				nornsGlimpseActive: spellState.opponentNornsGlimpseActive,
				allInAura: spellState.opponentAllInAura,
				destinyOverrideReady: spellState.opponentDestinyOverrideReady,
				revealedCards: spellState.revealedOpponentCards,
			},
		},
		runTwiceActive: spellState.runTwiceActive,
		ragnarokGambitActive: spellState.ragnarokGambitActive,
		destinyOverrideOptions: [...store.destinyOverrideOptions].sort(),
		pendingSpellIds: store.pendingPokerSpells.map((spell) => spell.id).sort(),
		isSpellPetPhase: store.isSpellPetPhase,
	};
}

export function computePhaseBoundaryStateRoot(input: Readonly<{
	fromPhase: PhaseCheckpointPhase;
	toPhase: PhaseCheckpointPhase;
	cardsHash: Hash256;
	combatStore: UnifiedCombatStore;
}>): Hash256 | null {
	const poker = canonicalizePokerCombatState(input.combatStore.pokerCombatState);
	if (input.toPhase === 'poker_combat' && poker === null) return null;
	const playerRole = input.combatStore.pokerCombatState?.deterministicPlayerRole ?? null;
	const projection = {
		version: PHASE_BOUNDARY_ROOT_VERSION,
		transition: [input.fromPhase, input.toPhase],
		cardsHash: input.cardsHash,
		chess: canonicalChess(input.combatStore),
		poker,
		pokerDeck: input.combatStore.pokerDeck.map(canonicalPokerCard),
		pokerHandsWon: playerRole
			? {
				[playerRole]: input.combatStore.pokerHandsWonPlayer,
				[playerRole === 'attacker' ? 'defender' : 'attacker']: input.combatStore.pokerHandsWonOpponent,
			}
			: null,
		pokerSpells: canonicalPokerSpells(input.combatStore, playerRole),
	};
	const digest = bytesToHex(sha256(ENCODER.encode(canonicalStringify([
		'ragnarok-phase-boundary-state',
		projection,
	]))));
	return Hash256Schema.parse(digest);
}

export function capturePhaseBoundaryStateRoot(input: Readonly<{
	fromPhase: PhaseCheckpointPhase;
	toPhase: PhaseCheckpointPhase;
	isCardsAuthority: boolean;
}>): Hash256 | null {
	const cardsHash = parseHash256(computeCardsPrevStateHash(
		useGameStore.getState().gameState,
		input.isCardsAuthority,
	));
	if (!cardsHash) return null;
	return computePhaseBoundaryStateRoot({
		fromPhase: input.fromPhase,
		toPhase: input.toPhase,
		cardsHash,
		combatStore: useUnifiedCombatStore.getState(),
	});
}
