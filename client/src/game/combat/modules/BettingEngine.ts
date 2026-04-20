/**
 * BettingEngine - Pure TypeScript poker betting logic
 * 
 * No React dependencies. Can be used for:
 * - Server-side validation
 * - AI decision making
 * - Unit testing
 */

import { CombatAction, CombatPhase } from '../../types/PokerCombatTypes';

export const BLINDS = {
        SB: 5,
        BB: 10,
        ANTE: 0.5
} as const;

export type BettingRoundType = 'preflop' | 'flop' | 'turn' | 'river';

export interface BettingState {
        pot: number;
        currentBet: number;
        playerBet: number;
        opponentBet: number;
        playerHpCommitted: number;
        opponentHpCommitted: number;
        bettingRound: BettingRoundType;
        lastAggressor: 'player' | 'opponent' | null;
}

export interface BettingActionInput {
        type: CombatAction;
        amount?: number;
}

export interface BettingResult {
        newState: BettingState;
        isRoundComplete: boolean;
        winner?: 'player' | 'opponent';
        hpLost?: number;
}

export function calculateMinBet(state: BettingState): number {
        return Math.max(BLINDS.BB, state.currentBet);
}

export function calculateMinRaise(state: BettingState): number {
        return state.currentBet + BLINDS.BB;
}

export function calculateCallAmount(state: BettingState, isPlayer: boolean): number {
        const currentPlayerBet = isPlayer ? state.playerBet : state.opponentBet;
        return Math.max(0, state.currentBet - currentPlayerBet);
}

export function canAffordBet(hp: number, amount: number): boolean {
        return hp >= amount;
}

export function processBettingAction(
        state: BettingState,
        actor: 'player' | 'opponent',
        action: BettingActionInput,
        actorHp: number
): BettingResult {
        const isPlayer = actor === 'player';
        const newState = { ...state };
        
        switch (action.type) {
                case CombatAction.BRACE: {
                        return {
                                newState,
                                isRoundComplete: true,
                                winner: isPlayer ? 'opponent' : 'player',
                                hpLost: 0
                        };
                }
                
                case CombatAction.DEFEND: {
                        const callAmount = calculateCallAmount(state, isPlayer);
                        if (callAmount > 0) {
                                return { newState: state, isRoundComplete: false };
                        }
                        const bothChecked = state.lastAggressor === null;
                        return {
                                newState,
                                isRoundComplete: bothChecked
                        };
                }
                
                case CombatAction.ENGAGE: {
                        const callAmount = calculateCallAmount(state, isPlayer);
                        if (!canAffordBet(actorHp, callAmount)) {
                                return { newState: state, isRoundComplete: false };
                        }
                        
                        if (isPlayer) {
                                newState.playerBet += callAmount;
                                newState.playerHpCommitted += callAmount;
                        } else {
                                newState.opponentBet += callAmount;
                                newState.opponentHpCommitted += callAmount;
                        }
                        newState.pot += callAmount;
                        
                        return {
                                newState,
                                isRoundComplete: true
                        };
                }
                
                case CombatAction.ATTACK: {
                        const betAmount = action.amount || calculateMinBet(state);
                        if (!canAffordBet(actorHp, betAmount)) {
                                return { newState: state, isRoundComplete: false };
                        }
                        
                        const additionalBet = betAmount - (isPlayer ? state.playerBet : state.opponentBet);
                        
                        if (isPlayer) {
                                newState.playerBet = betAmount;
                                newState.playerHpCommitted += additionalBet;
                        } else {
                                newState.opponentBet = betAmount;
                                newState.opponentHpCommitted += additionalBet;
                        }
                        newState.currentBet = betAmount;
                        newState.pot += additionalBet;
                        newState.lastAggressor = actor;
                        
                        return {
                                newState,
                                isRoundComplete: false
                        };
                }
                
                case CombatAction.COUNTER_ATTACK: {
                        const raiseAmount = action.amount || calculateMinRaise(state);
                        if (!canAffordBet(actorHp, raiseAmount)) {
                                return { newState: state, isRoundComplete: false };
                        }
                        
                        const additionalBet = raiseAmount - (isPlayer ? state.playerBet : state.opponentBet);
                        
                        if (isPlayer) {
                                newState.playerBet = raiseAmount;
                                newState.playerHpCommitted += additionalBet;
                        } else {
                                newState.opponentBet = raiseAmount;
                                newState.opponentHpCommitted += additionalBet;
                        }
                        newState.currentBet = raiseAmount;
                        newState.pot += additionalBet;
                        newState.lastAggressor = actor;
                        
                        return {
                                newState,
                                isRoundComplete: false
                        };
                }
                
                default:
                        return { newState: state, isRoundComplete: false };
        }
}

export function initializeBettingState(playerIsSB: boolean = false): BettingState {
        const playerBlind = playerIsSB ? BLINDS.SB : BLINDS.BB;
        const opponentBlind = playerIsSB ? BLINDS.BB : BLINDS.SB;
        return {
                pot: BLINDS.SB + BLINDS.BB + (BLINDS.ANTE * 2),
                currentBet: BLINDS.BB,
                playerBet: playerBlind,
                opponentBet: opponentBlind,
                playerHpCommitted: playerBlind + BLINDS.ANTE,
                opponentHpCommitted: opponentBlind + BLINDS.ANTE,
                bettingRound: 'preflop',
                lastAggressor: null
        };
}
