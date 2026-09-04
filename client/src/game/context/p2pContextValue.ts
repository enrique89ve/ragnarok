/**
 * Context value + interface for P2P actions.
 *
 * Lives in a separate `.ts` (no JSX) file from the Provider component so Vite's
 * Fast Refresh can hot-reload `P2PContext.tsx` (component-only) without falling
 * back to a full page reload. See:
 * https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#consistent-components-exports
 */

import { createContext } from 'react';
import type { GameCommand } from '../core/commands';
import type { FrontlineAttackMode, HeroPowerTargetType } from '../core/commands';
import type { GameCommandCommitCallback } from '../actions/gameCommandDispatcher';
import type { CombatAction } from '../types/PokerCombatTypes';
import type { PokerActionOrigin } from '@shared/p2p-wire/combat';
import type { GameState } from '../types';
import type { CardData } from '../types';
import type { Hash256 } from '@shared/p2p-wire/integrity';
import type { PhaseCheckpointPhase } from '@shared/p2p-wire/phaseCheckpoint';
import type { PhaseCheckpointRequestResult } from '../p2p/phaseCheckpointClient';

export interface P2PActions {
	playCard: (
		cardId: string,
		targetId?: string,
		targetType?: 'minion' | 'hero',
		insertionIndex?: number,
		payWithBlood?: boolean,
		onCommitted?: GameCommandCommitCallback,
	) => void;
	attackWithCard: (attackerId: string, defenderId?: string, onCommitted?: GameCommandCommitCallback) => void;
	endTurn: (onCommitted?: GameCommandCommitCallback) => void;
	performHeroPower: (targetId?: string, targetType?: HeroPowerTargetType, onCommitted?: GameCommandCommitCallback) => void;
	frontlineAttack: (mode: FrontlineAttackMode, actionId?: string, onCommitted?: GameCommandCommitCallback) => void;
	performNorseHeroPower: (norseHeroId: string, targetId?: string, targetType?: 'minion' | 'hero', actionId?: string, onCommitted?: GameCommandCommitCallback) => void;
	weaponUpgrade: (norseHeroId: string, actionId?: string, onCommitted?: GameCommandCommitCallback) => void;
	selectDiscoveryOption: (card: CardData | null, onCommitted?: GameCommandCommitCallback) => void;
	grantPokerHandRewards: (command: Extract<GameCommand, { type: 'grant_poker_hand_rewards' }>, onCommitted?: GameCommandCommitCallback) => void;
	dispatchGameCommand: (command: GameCommand, onCommitted?: GameCommandCommitCallback) => void;
	sendPokerAction: (input: {
		playerId: string;
		action: CombatAction;
		origin: PokerActionOrigin;
		hpCommitment?: number;
		turnId?: string | null;
		prevStateHash?: string;
		/** Caller-supplied stable id so the local transcript mirrors the wire. */
		decisionId?: string;
	}) => Promise<boolean>;
	sendPokerTurnStarted: (input: {
		combatId: string;
		turnId: string;
		phase: string;
		activePlayerId: string;
		actionsThisRound: number;
		durationMs: number;
		remainingMs?: number;
	}) => boolean;
	requestPhaseCheckpoint: (input: {
		readonly fromPhase: PhaseCheckpointPhase;
		readonly toPhase: PhaseCheckpointPhase;
		readonly stateRoot: Hash256;
	}) => Promise<PhaseCheckpointRequestResult>;
	downloadSessionLog: () => void;
	gameState: GameState | null;
	isConnected: boolean;
	isHost: boolean;
}

export const P2PContext = createContext<P2PActions | null>(null);
